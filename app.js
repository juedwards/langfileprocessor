console.log('External script loading...');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM ready, initializing app...');
    
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const chooseBtn = document.getElementById('chooseFileBtn');
    
    if (!uploadArea || !fileInput || !chooseBtn) {
        console.error('Required elements not found');
        return;
    }
    
    console.log('Elements found, adding listeners...');
    
    // Button click handler
    chooseBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Choose button clicked');
        fileInput.click();
    });
    
    // Upload area click handler
    uploadArea.addEventListener('click', function(e) {
        if (e.target !== chooseBtn) {
            console.log('Upload area clicked');
            fileInput.click();
        }
    });
    
    // File change handler
    fileInput.addEventListener('change', function(e) {
        console.log('File selected in change handler');
        handleFile(e);
    });
    
    // Drag and drop handlers
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', function() {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile({ target: { files: files } });
        }
    });
    
    console.log('Event listeners attached successfully');
});

function handleFile(event) {
    console.log('handleFile called');
    const file = event.target.files[0];
    console.log('File selected:', file ? file.name : 'null');
    
    if (!file) {
        console.log('No file selected');
        return;
    }

    const fileName = file.name.toLowerCase();
    console.log('Checking file type for:', fileName);
    
    if (!fileName.endsWith('.mcworld') && !fileName.endsWith('.mctemplate')) {
        console.log('Invalid file type');
        showError('Please select a valid .mcworld or .mctemplate file.');
        return;
    }

    console.log('File type validated, updating UI');
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.classList.add('file-selected');
    uploadArea.querySelector('.upload-text').textContent = `Selected: ${file.name}`;
    
    console.log('Calling processFile...');
    processFile(file);
}

function processFile(file) {
    console.log('processFile called with:', file.name);
    
    const loading = document.getElementById('loading');
    const progressContainer = document.getElementById('progressContainer');
    const results = document.getElementById('results');
    
    try {
        console.log('Starting processFile execution...');
        loading.classList.add('show');
        progressContainer.style.display = 'block';
        results.innerHTML = '';

        updateProgress(10, 'Reading file...');
        console.log('Progress updated to 10%');

        console.log('Creating JSZip instance...');
        const zip = new JSZip();
        console.log('JSZip instance created successfully');
        
        console.log('Starting zip.loadAsync...');
        
        zip.loadAsync(file).then(zipContent => {
            console.log('ZIP loaded successfully, files:', Object.keys(zipContent.files).length);

            updateProgress(30, 'Extracting files...');
            console.log('Progress updated to 30%');

            const filePromises = [];

            console.log('Iterating through zip files...');
            zipContent.forEach((relativePath, file) => {
                console.log('Found file:', relativePath, 'isDir:', file.dir);
                if (relativePath.toLowerCase().endsWith('.lang') && !file.dir) {
                    console.log('Adding .lang file:', relativePath);
                    filePromises.push(
                        file.async('text').then(content => ({
                            path: relativePath,
                            content: content,
                            size: content.length
                        }))
                    );
                }
            });

            console.log('Found', filePromises.length, 'language files to process');

            if (filePromises.length === 0) {
                throw new Error('No language files found in the archive');
            }

            updateProgress(60, 'Processing language files...');
            console.log('Progress updated to 60%');

            console.log('Awaiting all file promises...');
            return Promise.all(filePromises);
            
        }).then(allLangFiles => {
            console.log('All language files processed:', allLangFiles.length);
            
            updateProgress(80, 'Analyzing content...');
            console.log('Progress updated to 80%');

            // Find the largest language file
            console.log('Finding largest language file...');
            const largestLangFile = allLangFiles.reduce((prev, current) => 
                (prev.size > current.size) ? prev : current
            );
            console.log('Largest language file:', largestLangFile.path, largestLangFile.size, 'characters');

            // Extract readable text from the largest file
            console.log('Extracting readable text...');
            const extractedText = extractReadableText(largestLangFile.content);
            console.log('Extracted text length:', extractedText.length);
            console.log('Extracted text preview:', extractedText.substring(0, 100));
            
            // Calculate readability scores
            console.log('Calculating readability scores...');
            const readabilityScores = calculateReadabilityScores(extractedText);
            console.log('Readability scores calculated:', readabilityScores);

            updateProgress(100, 'Complete!');
            console.log('Progress updated to 100%');

            // Hide loading
            loading.classList.remove('show');
            progressContainer.style.display = 'none';
            
            // Call displayAnalysis
            console.log('Calling displayAnalysis...');
            displayAnalysis(largestLangFile, extractedText, readabilityScores, allLangFiles.length);
            
        }).catch(error => {
            console.error('Error in promise chain:', error);
            console.error('Error stack:', error.stack);
            loading.classList.remove('show');
            progressContainer.style.display = 'none';
            showError(`Error processing file: ${error.message}`);
        });

    } catch (error) {
        console.error('Error in processFile:', error);
        console.error('Error stack:', error.stack);
        loading.classList.remove('show');
        progressContainer.style.display = 'none';
        showError(`Error processing file: ${error.message}`);
    }
}

function extractReadableText(langContent) {
    const lines = langContent.split('\n');
    const readableTexts = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, value] = trimmed.split('=', 2);
            if (value) {
                // Clean the text value extensively
                let cleanText = value.trim()
                    .replace(/§[0-9a-fk-or]/g, '') // Remove Minecraft color codes
                    .replace(/\\n/g, ' ') // Replace escaped newlines with spaces
                    .replace(/###{[^}]*}/g, '') // Remove ###{LOCKED} and similar patterns
                    .replace(/##+/g, '') // Remove multiple # symbols
                    .replace(/:{2,}/g, '') // Remove :: patterns
                    .replace(/~{2,}/g, '') // Remove ~~ patterns
                    .replace(/_{2,}/g, '') // Remove __ patterns
                    .replace(/:{[^}]*}:/g, '') // Remove :key: patterns like :_input_key.codeBuilder:
                    .replace(/\{[^}]*\}/g, '') // Remove any remaining {content} patterns
                    .replace(/\[[^\]]*\]/g, '') // Remove [content] patterns
                    .replace(/\([^)]*\)/g, '') // Remove (content) patterns if they look like metadata
                    .replace(/[#$%^&*+=<>|\\]/g, '') // Remove special characters commonly used in markup
                    .replace(/\s+/g, ' ') // Normalize whitespace
                    .trim();
                
                // Additional filtering - only include text that looks like natural language
                if (cleanText && 
                    cleanText.length > 3 && // Must be longer than 3 characters
                    /[a-zA-Z]/.test(cleanText) && // Must contain letters
                    !/^\d+\.?\d*$/.test(cleanText) && // Not just numbers
                    !cleanText.match(/^[^a-zA-Z0-9\s]+$/) && // Not just special characters
                    cleanText.split(' ').length >= 2 // Must have at least 2 words for meaningful text
                ) {
                    readableTexts.push(cleanText);
                }
            }
        }
    }

    return readableTexts.join(' ');
}

function calculateReadabilityScores(text) {
    console.log('calculateReadabilityScores called with text length:', text.length);
    
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const characters = text.replace(/\s/g, '').length;
    
    const sentenceCount = sentences.length;
    const wordCount = words.length;
    const characterCount = characters;
    
    console.log('Basic stats - sentences:', sentenceCount, 'words:', wordCount, 'characters:', characterCount);
    
    if (sentenceCount === 0 || wordCount === 0) {
        console.error('Invalid text - no sentences or words found');
        return null;
    }

    // Calculate syllables for words
    console.log('Calculating syllables...');
    const syllableCounts = words.map(word => countSyllables(word));
    const totalSyllables = syllableCounts.reduce((sum, count) => sum + count, 0);
    const complexWords = words.filter(word => countSyllables(word) >= 3).length;

    console.log('Syllable stats - total:', totalSyllables, 'complex words:', complexWords);

    // Average metrics
    const avgWordsPerSentence = wordCount / sentenceCount;
    const avgSyllablesPerWord = totalSyllables / wordCount;
    const avgCharsPerWord = characterCount / wordCount;

    console.log('Averages - words/sentence:', avgWordsPerSentence, 'syllables/word:', avgSyllablesPerWord, 'chars/word:', avgCharsPerWord);

    const scores = {};

    try {
        // Flesch Reading Ease
        scores.fleschReadingEase = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
        scores.fleschReadingEase = Math.max(0, Math.min(100, scores.fleschReadingEase));

        // Flesch-Kincaid Grade Level
        scores.fleschKincaidGrade = (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59;
        scores.fleschKincaidGrade = Math.max(0, scores.fleschKincaidGrade);

        // Gunning Fog Index
        const complexWordPercentage = (complexWords / wordCount) * 100;
        scores.gunningFog = 0.4 * (avgWordsPerSentence + complexWordPercentage);

        // SMOG Index
        if (sentenceCount >= 3) {
            scores.smogIndex = 1.043 * Math.sqrt(complexWords * (30 / sentenceCount)) + 3.1291;
        } else {
            scores.smogIndex = scores.gunningFog; // Fallback
        }

        // Coleman-Liau Index
        const avgCharsPerHundredWords = (characterCount / wordCount) * 100;
        const avgSentencesPerHundredWords = (sentenceCount / wordCount) * 100;
        scores.colemanLiau = (0.0588 * avgCharsPerHundredWords) - (0.296 * avgSentencesPerHundredWords) - 15.8;

        // Automated Readability Index
        scores.automatedReadability = (4.71 * avgCharsPerWord) + (0.5 * avgWordsPerSentence) - 21.43;

        // Linsear Write Formula
        const easyWords = words.filter(word => countSyllables(word) <= 2).length;
        const hardWords = wordCount - easyWords;
        scores.linsearWrite = ((easyWords + (hardWords * 3)) / sentenceCount);
        if (scores.linsearWrite > 20) {
            scores.linsearWrite = scores.linsearWrite / 2;
        } else {
            scores.linsearWrite = (scores.linsearWrite - 2) / 2;
        }

        // Additional statistics
        scores.stats = {
            sentences: sentenceCount,
            words: wordCount,
            characters: characterCount,
            syllables: totalSyllables,
            complexWords: complexWords,
            avgWordsPerSentence: avgWordsPerSentence,
            avgSyllablesPerWord: avgSyllablesPerWord,
            avgCharsPerWord: avgCharsPerWord
        };

        console.log('All readability scores calculated successfully');
        return scores;
        
    } catch (error) {
        console.error('Error calculating readability scores:', error);
        return null;
    }
}

function countSyllables(word) {
    if (!word || word.length === 0) return 0;
    
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length === 0) return 0;
    
    let syllables = 0;
    let previousWasVowel = false;
    const vowels = 'aeiouy';
    
    for (let i = 0; i < word.length; i++) {
        const isVowel = vowels.includes(word[i]);
        if (isVowel && !previousWasVowel) {
            syllables++;
        }
        previousWasVowel = isVowel;
    }
    
    // Handle silent 'e'
    if (word.endsWith('e') && syllables > 1) {
        syllables--;
    }
    
    return Math.max(1, syllables);
}

function displayAnalysis(largestFile, extractedText, scores, totalFiles) {
    console.log('displayAnalysis called');
    
    if (!scores) {
        showError('Could not analyze the text content');
        return;
    }

    const results = document.getElementById('results');

    // Calculate interpretation data
    const gradeLevelScores = [
        scores.fleschKincaidGrade || 0,
        scores.gunningFog || 0,
        scores.smogIndex || 0,
        scores.colemanLiau || 0,
        scores.automatedReadability || 0,
        scores.linsearWrite || 0
    ];
    
    const avgGradeLevel = gradeLevelScores.reduce((sum, score) => sum + score, 0) / gradeLevelScores.length;
    const avgAge = Math.round(avgGradeLevel + 5);
    
    // Determine difficulty level
    let difficultyLevel = "Standard";
    let audienceDescription = "general audience";
    
    if (scores.fleschReadingEase >= 90) {
        difficultyLevel = "Very Easy";
        audienceDescription = "easily understood by 11-year-olds and below";
    } else if (scores.fleschReadingEase >= 80) {
        difficultyLevel = "Easy";
        audienceDescription = "easily understood by 12-13 year olds";
    } else if (scores.fleschReadingEase >= 70) {
        difficultyLevel = "Fairly Easy";
        audienceDescription = "easily understood by 13-15 year olds";
    } else if (scores.fleschReadingEase >= 60) {
        difficultyLevel = "Standard";
        audienceDescription = "easily understood by 15-17 year olds";
    } else if (scores.fleschReadingEase >= 50) {
        difficultyLevel = "Fairly Difficult";
        audienceDescription = "understood by high school graduates";
    } else if (scores.fleschReadingEase >= 30) {
        difficultyLevel = "Difficult";
        audienceDescription = "understood by college-level readers";
    } else {
        difficultyLevel = "Very Difficult";
        audienceDescription = "understood by university graduates";
    }

    // Build HTML
    let html = '';
    
    // Analysis Summary
    html += '<div class="analysis-section">';
    html += '<h2 class="section-title">Analysis Summary</h2>';
    html += '<div class="stats-grid">';
    html += '<div class="stat-card"><div class="stat-value">' + totalFiles + '</div><div class="stat-label">Total Language Files</div></div>';
    html += '<div class="stat-card"><div class="stat-value">' + scores.stats.sentences + '</div><div class="stat-label">Sentences</div></div>';
    html += '<div class="stat-card"><div class="stat-value">' + scores.stats.words + '</div><div class="stat-label">Words</div></div>';
    html += '<div class="stat-card"><div class="stat-value">' + scores.stats.complexWords + '</div><div class="stat-label">Complex Words</div></div>';
    html += '</div></div>';

    // File Analysis
    html += '<div class="analysis-section">';
    html += '<h2 class="section-title">File Analysis</h2>';
    html += '<div class="three-column-layout">';
    
    // Largest Language File
    html += '<div class="file-display">';
    html += '<div class="file-header">Largest Language File</div>';
    html += '<div><strong>Path:</strong> ' + escapeHtml(largestFile.path) + '</div>';
    html += '<div><strong>Size:</strong> ' + largestFile.size + ' characters</div>';
    html += '<div class="file-content">' + escapeHtml(largestFile.content.substring(0, 1000));
    if (largestFile.content.length > 1000) html += '\\n\\n... (truncated)';
    html += '</div></div>';

    // Extracted Text Content
    html += '<div class="file-display">';
    html += '<div class="file-header">Extracted Text Content</div>';
    html += '<div class="download-section">';
    html += '<button class="btn" onclick="downloadSimpleText()">Download Text as TXT</button>';
    html += '<button class="btn" onclick="downloadSimpleAnalysis()">Download Full Analysis</button>';
    html += '</div>';
    html += '<div class="file-content">' + escapeHtml(extractedText.substring(0, 1000));
    if (extractedText.length > 1000) html += '\\n\\n... (truncated)';
    html += '</div></div>';

    // Readability Scores
    html += '<div class="readability-scores">';
    html += '<div class="file-header">Readability Scores</div>';
    html += '<div class="score-item"><span class="score-name">Flesch Reading Ease</span>';
    html += '<span class="score-value">' + scores.fleschReadingEase.toFixed(1) + '</span></div>';
    html += '<div class="score-item"><span class="score-name">Flesch-Kincaid Grade</span>';
    html += '<span class="score-value">' + scores.fleschKincaidGrade.toFixed(1) + '</span></div>';
    html += '<div class="score-item"><span class="score-name">Gunning Fog Index</span>';
    html += '<span class="score-value">' + scores.gunningFog.toFixed(1) + '</span></div>';
    html += '<div class="score-item"><span class="score-name">SMOG Index</span>';
    html += '<span class="score-value">' + scores.smogIndex.toFixed(1) + '</span></div>';
    html += '<div class="score-item"><span class="score-name">Coleman-Liau Index</span>';
    html += '<span class="score-value">' + scores.colemanLiau.toFixed(1) + '</span></div>';
    html += '<div class="score-item"><span class="score-name">Automated Readability</span>';
    html += '<span class="score-value">' + scores.automatedReadability.toFixed(1) + '</span></div>';
    html += '<div class="score-item"><span class="score-name">Linsear Write</span>';
    html += '<span class="score-value">' + scores.linsearWrite.toFixed(1) + '</span></div>';
    html += '</div>';
    
    html += '</div></div>'; // Close three-column-layout and analysis-section

    // Chart Section
    html += '<div class="analysis-section">';
    html += '<h2 class="section-title">Readability Analysis Chart</h2>';
    html += '<div class="chart-container"><canvas id="readabilityChart"></canvas></div>';
    html += '</div>';

    // Reading Level Interpretation
    html += '<div class="analysis-section">';
    html += '<h2 class="section-title">Reading Level Interpretation</h2>';
    html += '<div class="readability-interpretation">';
    
    // Reading Level Summary
    html += '<div class="interpretation-section">';
    html += '<h4>Reading Level Summary</h4>';
    html += '<p><strong>Overall Difficulty:</strong> ' + difficultyLevel + ' (Flesch Reading Ease: ' + scores.fleschReadingEase.toFixed(1) + ')</p>';
    html += '<p><strong>Average Grade Level:</strong> ' + avgGradeLevel.toFixed(1) + ' (approximately ' + avgAge + ' years old)</p>';
    html += '<p><strong>Target Audience:</strong> This content is ' + audienceDescription + '.</p>';
    html += '</div>';
    
    // Recommendations
    html += '<div class="interpretation-section">';
    html += '<h4>Recommendations</h4>';
    const minAge = Math.max(6, Math.round(avgGradeLevel + 4));
    const maxAge = Math.round(avgGradeLevel + 7);
    html += '<p><strong>Best suited for:</strong> Ages ' + minAge + '-' + maxAge + ' (Grades ' + Math.max(1, Math.round(avgGradeLevel - 1)) + '-' + Math.round(avgGradeLevel + 2) + ')</p>';
    
    if (avgGradeLevel <= 3) {
        html += '<p><strong>Educational Context:</strong> Perfect for early elementary students learning to read independently.</p>';
    } else if (avgGradeLevel <= 6) {
        html += '<p><strong>Educational Context:</strong> Ideal for elementary to middle school students.</p>';
    } else if (avgGradeLevel <= 9) {
        html += '<p><strong>Educational Context:</strong> Appropriate for middle to high school students.</p>';
    } else if (avgGradeLevel <= 12) {
        html += '<p><strong>Educational Context:</strong> Suitable for high school students and above.</p>';
    } else {
        html += '<p><strong>Educational Context:</strong> College-level content requiring advanced reading skills.</p>';
    }
    html += '</div>';
    
    html += '</div></div>'; // Close readability-interpretation and analysis-section

    // Store data globally for download functions
    window.currentExtractedText = extractedText;
    window.currentScores = scores;
    window.currentLargestFile = largestFile;

    results.innerHTML = html;

    // Create chart
    setTimeout(() => {
        try {
            createReadabilityChart(scores);
        } catch (error) {
            console.error('Chart creation error:', error);
        }
    }, 100);
}

function createReadabilityChart(scores) {
    const ctx = document.getElementById('readabilityChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [
                'Flesch-Kincaid Grade',
                'Gunning Fog Index',
                'SMOG Index',
                'Coleman-Liau',
                'Automated Readability',
                'Linsear Write'
            ],
            datasets: [{
                label: 'Grade Level Scores',
                data: [
                    scores.fleschKincaidGrade,
                    scores.gunningFog,
                    scores.smogIndex,
                    scores.colemanLiau,
                    scores.automatedReadability,
                    scores.linsearWrite
                ],
                backgroundColor: [
                    'rgba(33, 150, 243, 0.8)',
                    'rgba(255, 152, 0, 0.8)',
                    'rgba(156, 39, 176, 0.8)',
                    'rgba(244, 67, 54, 0.8)',
                    'rgba(0, 188, 212, 0.8)',
                    'rgba(255, 235, 59, 0.8)'
                ],
                borderColor: [
                    'rgba(33, 150, 243, 1)',
                    'rgba(255, 152, 0, 1)',
                    'rgba(156, 39, 176, 1)',
                    'rgba(244, 67, 54, 1)',
                    'rgba(0, 188, 212, 1)',
                    'rgba(255, 235, 59, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Grade Level'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Readability Metrics'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: `Grade Level Analysis (Flesch Reading Ease: ${scores.fleschReadingEase.toFixed(1)} - Very Easy)`
                }
            }
        }
    });
}

function downloadSimpleText() {
    if (window.currentExtractedText) {
        downloadText(window.currentExtractedText, 'extracted_text.txt');
    }
}

function downloadSimpleAnalysis() {
    if (window.currentScores && window.currentLargestFile && window.currentExtractedText) {
        downloadAnalysis(window.currentScores, window.currentLargestFile.path, window.currentExtractedText);
    }
}

function downloadText(text, filename) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

function downloadAnalysis(scores, filePath, extractedText) {
    // Calculate interpretation data
    const gradeLevelScores = [
        scores.fleschKincaidGrade,
        scores.gunningFog,
        scores.smogIndex,
        scores.colemanLiau,
        scores.automatedReadability,
        scores.linsearWrite
    ];
    
    const avgGradeLevel = gradeLevelScores.reduce((sum, score) => sum + score, 0) / gradeLevelScores.length;
    const avgAge = Math.round(avgGradeLevel + 5);
    
    let difficultyLevel;
    if (scores.fleschReadingEase >= 90) difficultyLevel = "Very Easy";
    else if (scores.fleschReadingEase >= 80) difficultyLevel = "Easy";
    else if (scores.fleschReadingEase >= 70) difficultyLevel = "Fairly Easy";
    else if (scores.fleschReadingEase >= 60) difficultyLevel = "Standard";
    else if (scores.fleschReadingEase >= 50) difficultyLevel = "Fairly Difficult";
    else if (scores.fleschReadingEase >= 30) difficultyLevel = "Difficult";
    else difficultyLevel = "Very Difficult";
    
    const analysisReport = `MINECRAFT EDUCATION LANGUAGE ANALYSIS REPORT
Generated: ${new Date().toLocaleString()}

==================================================
SOURCE INFORMATION
==================================================
File Path: ${filePath}
Analysis Date: ${new Date().toLocaleDateString()}

==================================================
READABILITY SCORES
==================================================
Flesch Reading Ease:       ${scores.fleschReadingEase.toFixed(1)} (${difficultyLevel})
Flesch-Kincaid Grade:      ${scores.fleschKincaidGrade.toFixed(1)}
Gunning Fog Index:         ${scores.gunningFog.toFixed(1)}
SMOG Index:                ${scores.smogIndex.toFixed(1)}
Coleman-Liau Index:        ${scores.colemanLiau.toFixed(1)}
Automated Readability:     ${scores.automatedReadability.toFixed(1)}
Linsear Write:             ${scores.linsearWrite.toFixed(1)}

==================================================
SUMMARY ANALYSIS
==================================================
Average Grade Level:       ${avgGradeLevel.toFixed(1)}
Recommended Age:           ${avgAge} years old
Difficulty Level:          ${difficultyLevel}
Educational Stage:         ${getEducationalStage(avgGradeLevel)}
Age Range:                 ${getAgeRangeRecommendation(avgGradeLevel)}

==================================================
TEXT STATISTICS
==================================================
Total Sentences:           ${scores.stats.sentences}
Total Words:               ${scores.stats.words}
Total Characters:          ${scores.stats.characters}
Total Syllables:           ${scores.stats.syllables}
Complex Words (3+ syllables): ${scores.stats.complexWords}
Average Words per Sentence: ${scores.stats.avgWordsPerSentence.toFixed(1)}
Average Syllables per Word: ${scores.stats.avgSyllablesPerWord.toFixed(2)}
Average Characters per Word: ${scores.stats.avgCharsPerWord.toFixed(1)}

==================================================
EDUCATIONAL RECOMMENDATIONS
==================================================
${getEducationalContext(avgGradeLevel, difficultyLevel)}

==================================================
EXTRACTED TEXT CONTENT
==================================================
${extractedText}

==================================================
END OF REPORT
    const blob = new Blob([analysisReport], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'readability_analysis_report.txt';
    a.click();
    window.URL.revokeObjectURL(url);
}

function getEducationalStage(gradeLevel) {
    if (gradeLevel <= 1) return "Kindergarten/Pre-K";
    else if (gradeLevel <= 5) return "Elementary School";
    else if (gradeLevel <= 8) return "Middle School";
    else if (gradeLevel <= 12) return "High School";
    else if (gradeLevel <= 16) return "College Level";
    else return "Graduate Level";
}

function getAgeRangeRecommendation(avgGradeLevel) {
    const minAge = Math.max(6, Math.round(avgGradeLevel + 4));
    const maxAge = Math.round(avgGradeLevel + 7);
    return `Ages ${minAge}-${maxAge} (Grades ${Math.max(1, Math.round(avgGradeLevel - 1))}-${Math.round(avgGradeLevel + 2)})`;
}

function getEducationalContext(avgGradeLevel, difficultyLevel) {
    if (avgGradeLevel <= 3) {
        return "Perfect for early elementary students learning to read independently. Content should be easily accessible to beginning readers.";
    } else if (avgGradeLevel <= 6) {
        return "Ideal for elementary to middle school students. Content is accessible while still providing educational value.";
    } else if (avgGradeLevel <= 9) {
        return "Appropriate for middle to high school students. May require some guidance for younger readers.";
    } else if (avgGradeLevel <= 12) {
        return "Suitable for high school students and above. Content assumes strong reading comprehension skills.";
    } else {
        return "College-level content requiring advanced reading skills and subject matter knowledge.";
    }
}

function updateProgress(percent, message) {
    const progressBar = document.getElementById('progressBar');
    const loading = document.getElementById('loading');
    
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
    }
    if (message && loading) {
        const loadingText = loading.querySelector('p');
        if (loadingText) {
            loadingText.textContent = message;
        }
    }
}

function showError(message) {
    const results = document.getElementById('results');
    results.innerHTML = `
        <div class="error">
            <strong>Error:</strong> ${message}
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
