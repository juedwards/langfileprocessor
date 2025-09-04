/* app.js */
console.log('External script loading...');

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM ready, initializing app...');

    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const chooseBtn = document.getElementById('chooseFileBtn');
    const loading = document.getElementById('loading');
    const progressContainer = document.getElementById('progressContainer');
    const results = document.getElementById('results');

    if (!uploadArea || !fileInput || !chooseBtn || !loading || !progressContainer || !results) {
        console.error('Required elements not found');
        return;
    }

    console.log('Elements found, adding listeners...');

    // The label opens the picker (no JS needed). We keep a log for debug:
    chooseBtn.addEventListener('click', () => console.log('Choose File label clicked'));

    // Upload area click handler (don’t double-trigger if label was clicked)
    uploadArea.addEventListener('click', function (e) {
        const clickedLabel = e.target === chooseBtn || e.target.closest('label[for="fileInput"]');
        if (!clickedLabel) {
            console.log('Upload area clicked');
            fileInput.click();
        }
    });

    // File change handler
    fileInput.addEventListener('change', function (e) {
        console.log('File selected in change handler');
        handleFile(e);
    });

    // Drag & drop handlers
    ['dragenter', 'dragover'].forEach(evt =>
        uploadArea.addEventListener(evt, function (e) {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.add('dragover');
        }, { passive: false })
    );

    ['dragleave', 'dragend', 'drop'].forEach(evt =>
        uploadArea.addEventListener(evt, function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (evt !== 'drop') uploadArea.classList.remove('dragover');
        })
    );

    uploadArea.addEventListener('drop', function (e) {
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            handleFile({ target: { files } });
        }
    });

    console.log('Event listeners attached successfully');

    /* =========================
       Core workflow functions
       ========================= */

    function handleFile(event) {
        console.log('handleFile called');
        clearError();
        const file = event.target.files?.[0];
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
        uploadArea.classList.add('file-selected');
        uploadArea.querySelector('.upload-text').textContent = `Selected: ${file.name}`;

        console.log('Calling processFile...');
        processFile(file);
    }

    function processFile(file) {
        console.log('processFile called with:', file.name);

        try {
            console.log('Starting processFile execution...');
            loading.classList.add('show');
            progressContainer.style.display = 'block';
            results.innerHTML = '';
            updateProgress(10, 'Reading file...');

            if (typeof JSZip === 'undefined') {
                throw new Error('JSZip not loaded');
            }

            console.log('Creating JSZip instance...');
            const zip = new JSZip();
            console.log('JSZip instance created successfully');

            console.log('Starting zip.loadAsync...');
            zip.loadAsync(file).then(zipContent => {
                console.log('ZIP loaded successfully, files:', Object.keys(zipContent.files).length);
                updateProgress(30, 'Extracting files...');

                const filePromises = [];
                console.log('Iterating through zip files...');
                zipContent.forEach((relativePath, file) => {
                    // Only actual files (not directories) with .lang
                    if (relativePath.toLowerCase().endsWith('.lang') && !file.dir) {
                        console.log('Adding .lang file:', relativePath);
                        filePromises.push(
                            file.async('text').then(content => ({
                                path: relativePath,
                                content,
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
                console.log('Awaiting all file promises...');
                return Promise.all(filePromises);

            }).then(allLangFiles => {
                console.log('All language files processed:', allLangFiles.length);
                updateProgress(80, 'Analyzing content...');

                // Largest language file by character length
                const largestLangFile = allLangFiles.reduce((prev, current) =>
                    (prev.size > current.size) ? prev : current
                );
                console.log('Largest language file:', largestLangFile.path, largestLangFile.size, 'characters');

                // Extract readable text from the largest file
                const extractedText = extractReadableText(largestLangFile.content);
                console.log('Extracted text length:', extractedText.length);
                console.log('Extracted text preview:', extractedText.substring(0, 100));

                // Calculate readability scores
                const readabilityScores = calculateReadabilityScores(extractedText);
                console.log('Readability scores calculated:', readabilityScores);

                updateProgress(100, 'Complete!');

                // Hide loading UI
                loading.classList.remove('show');
                progressContainer.style.display = 'none';

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

    /* =========================
       Text extraction & scoring
       ========================= */

    function extractReadableText(langContent) {
        const lines = langContent.split('\n');
        const readableTexts = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                const [_, value] = trimmed.split('=', 2);
                if (value) {
                    // Clean the text value extensively
                    let cleanText = value.trim()
                        .replace(/§[0-9a-fk-or]/gi, '')  // Remove Minecraft color codes
                        .replace(/\\n/g, ' ')             // Replace escaped newlines with spaces
                        .replace(/###{[^}]*}/g, '')       // Remove ###{LOCKED} and similar
                        .replace(/##+/g, '')              // Remove repeated #
                        .replace(/:{2,}/g, '')            // Remove ::
                        .replace(/~{2,}/g, '')            // Remove ~~
                        .replace(/_{2,}/g, '')            // Remove __
                        .replace(/:{[^}]*}:/g, '')        // Remove :key: patterns
                        .replace(/\{[^}]*}/g, '')         // Remove {content}
                        .replace(/\[[^\]]*]/g, '')        // Remove [content]
                        .replace(/\([^)]*\)/g, '')        // Remove (content) metadata-ish
                        .replace(/[#$%^&*+=<>|\\]/g, '')  // Remove noisy special chars
                        .replace(/\s+/g, ' ')             // Normalize whitespace
                        .trim();

                    // Keep only likely natural language
                    if (cleanText &&
                        cleanText.length > 3 &&
                        /[a-zA-Z]/.test(cleanText) &&
                        !/^\d+\.?\d*$/.test(cleanText) &&
                        !/^[^a-zA-Z0-9\s]+$/.test(cleanText) &&
                        cleanText.split(' ').length >= 2
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
        const totalSyllables = syllableCounts.reduce((sum, c) => sum + c, 0);
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
            const L = (characterCount / wordCount) * 100;     // avg chars per 100 words
            const S = (sentenceCount / wordCount) * 100;      // avg sentences per 100 words
            scores.colemanLiau = (0.0588 * L) - (0.296 * S) - 15.8;

            // Automated Readability Index
            scores.automatedReadability = (4.71 * avgCharsPerWord) + (0.5 * avgWordsPerSentence) - 21.43;

            // Linsear Write Formula (approximation)
            const easyWords = words.filter(word => countSyllables(word) <= 2).length;
            const hardWords = wordCount - easyWords;
            let lwRaw = ((easyWords + (hardWords * 3)) / sentenceCount);
            scores.linsearWrite = lwRaw > 20 ? lwRaw / 2 : (lwRaw - 2) / 2;

            // Additional statistics
            scores.stats = {
                sentences: sentenceCount,
                words: wordCount,
                characters: characterCount,
                syllables: totalSyllables,
                complexWords,
                avgWordsPerSentence,
                avgSyllablesPerWord,
                avgCharsPerWord
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
        if (word.endsWith('e') && syllables > 1) syllables--;

        return Math.max(1, syllables);
    }

    /* =========================
       Rendering & downloads
       ========================= */

    function displayAnalysis(largestFile, extractedText, scores, totalFiles) {
        console.log('displayAnalysis called');

        if (!scores) {
            showError('Could not analyze the text content');
            return;
        }

        const diffLevel = difficultyFromFRE(scores.fleschReadingEase);
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

        let audienceDescription = "general audience";
        if (scores.fleschReadingEase >= 90) audienceDescription = "easily understood by 11-year-olds and below";
        else if (scores.fleschReadingEase >= 80) audienceDescription = "easily understood by 12–13 year olds";
        else if (scores.fleschReadingEase >= 70) audienceDescription = "easily understood by 13–15 year olds";
        else if (scores.fleschReadingEase >= 60) audienceDescription = "easily understood by 15–17 year olds";
        else if (scores.fleschReadingEase >= 50) audienceDescription = "understood by high school graduates";
        else if (scores.fleschReadingEase >= 30) audienceDescription = "understood by college-level readers";
        else audienceDescription = "understood by university graduates";

        const minAge = Math.max(6, Math.round(avgGradeLevel + 4));
        const maxAge = Math.round(avgGradeLevel + 7);

        // Build HTML (kept as string for performance)
        let html = '';

        // Analysis Summary
        html += '<div class="analysis-section">';
        html += '<h2 class="section-title">Analysis Summary</h2>';
        html += '<div class="stats-grid">';
        html += `<div class="stat-card"><div class="stat-value">${totalFiles}</div><div class="stat-label">Total Language Files</div></div>`;
        html += `<div class="stat-card"><div class="stat-value">${scores.stats.sentences}</div><div class="stat-label">Sentences</div></div>`;
        html += `<div class="stat-card"><div class="stat-value">${scores.stats.words}</div><div class="stat-label">Words</div></div>`;
        html += `<div class="stat-card"><div class="stat-value">${scores.stats.complexWords}</div><div class="stat-label">Complex Words</div></div>`;
        html += '</div></div>';

        // File Analysis
        html += '<div class="analysis-section">';
        html += '<h2 class="section-title">File Analysis</h2>';
        html += '<div class="three-column-layout">';

        // Largest Language File
        html += '<div class="file-display">';
        html += '<div class="file-header">Largest Language File</div>';
        html += `<div><strong>Path:</strong> ${escapeHtml(largestFile.path)}</div>`;
        html += `<div><strong>Size:</strong> ${largestFile.size} characters</div>`;
        html += '<div class="file-content">' + escapeHtml(largestFile.content.substring(0, 1000));
        if (largestFile.content.length > 1000) html += '\n\n... (truncated)';
        html += '</div></div>';

        // Extracted Text Content
        html += '<div class="file-display">';
        html += '<div class="file-header">Extracted Text Content</div>';
        html += '<div class="download-section">';
        html += '<button class="btn" onclick="downloadSimpleText()">Download Text as TXT</button>';
        html += '<button class="btn" onclick="downloadSimpleAnalysis()">Download Full Analysis</button>';
        html += '</div>';
        html += '<div class="file-content">' + escapeHtml(extractedText.substring(0, 1000));
        if (extractedText.length > 1000) html += '\n\n... (truncated)';
        html += '</div></div>';

        // Readability Scores
        html += '<div class="readability-scores">';
        html += '<div class="file-header">Readability Scores</div>';
        html += scoreRow('Flesch Reading Ease', scores.fleschReadingEase);
        html += scoreRow('Flesch-Kincaid Grade', scores.fleschKincaidGrade);
        html += scoreRow('Gunning Fog Index', scores.gunningFog);
        html += scoreRow('SMOG Index', scores.smogIndex);
        html += scoreRow('Coleman-Liau Index', scores.colemanLiau);
        html += scoreRow('Automated Readability', scores.automatedReadability);
        html += scoreRow('Linsear Write', scores.linsearWrite);
        html += '</div>';

        html += '</div></div>'; // close three-column-layout, analysis-section

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
        html += `<h4>Reading Level Summary</h4>`;
        html += `<p><strong>Overall Difficulty:</strong> ${diffLevel} (Flesch Reading Ease: ${scores.fleschReadingEase.toFixed(1)})</p>`;
        html += `<p><strong>Average Grade Level:</strong> ${avgGradeLevel.toFixed(1)} (approximately ${avgAge} years old)</p>`;
        html += `<p><strong>Target Audience:</strong> This content is ${audienceDescription}.</p>`;
        html += '</div>';

        // Recommendations
        html += '<div class="interpretation-section">';
        html += '<h4>Recommendations</h4>';
        html += `<p><strong>Best suited for:</strong> Ages ${minAge}-${maxAge} (Grades ${Math.max(1, Math.round(avgGradeLevel - 1))}-${Math.round(avgGradeLevel + 2)})</p>`;
        html += `<p><strong>Educational Context:</strong> ${getEducationalContext(avgGradeLevel, diffLevel)}</p>`;
        html += '</div>';

        html += '</div></div>'; // close readability-interpretation and analysis-section

        // Store data globally for download functions
        window.currentExtractedText = extractedText;
        window.currentScores = scores;
        window.currentLargestFile = largestFile;

        results.innerHTML = html;

        // Create chart
        setTimeout(() => {
            try {
                createReadabilityChart(scores, diffLevel);
            } catch (error) {
                console.error('Chart creation error:', error);
            }
        }, 100);
    }

    function createReadabilityChart(scores, diffLabel) {
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded, skipping chart');
            return;
        }
        const canvas = document.getElementById('readabilityChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

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
                    // Use defaults; colors are defined by Chart.js theme
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Grade Level' }
                    },
                    x: { title: { display: true, text: 'Readability Metrics' } }
                },
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: `Grade Level Analysis (FRE: ${scores.fleschReadingEase.toFixed(1)} – ${diffLabel})`
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

    // Expose download funcs globally for inline onclick handlers
    window.downloadSimpleText = downloadSimpleText;
    window.downloadSimpleAnalysis = downloadSimpleAnalysis;

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
        const difficultyLevel = difficultyFromFRE(scores.fleschReadingEase);

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
==================================================`;

        downloadText(analysisReport, 'language_analysis.txt');
    }

    /* =========================
       Helpers & UI utilities
       ========================= */

    function updateProgress(percent, message) {
        const bar = document.getElementById('progressBar');
        if (!bar) return;
        const clamped = Math.max(0, Math.min(100, percent | 0));
        bar.style.width = `${clamped}%`;
        bar.setAttribute('aria-valuenow', String(clamped));
        bar.setAttribute('aria-label', message || '');
        console.log(`Progress: ${clamped}% - ${message || ''}`);
    }

    function showError(msg) {
        const errHtml = `<div class="error" role="alert">${escapeHtml(msg)}</div>`;
        // Prepend error above results so it’s visible
        const container = document.querySelector('.content');
        if (container) container.insertAdjacentHTML('afterbegin', errHtml);
        else results.insertAdjacentHTML('afterbegin', errHtml);
    }

    function clearError() {
        document.querySelectorAll('.error').forEach(el => el.remove());
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function difficultyFromFRE(fre) {
        if (fre >= 90) return 'Very Easy';
        if (fre >= 80) return 'Easy';
        if (fre >= 70) return 'Fairly Easy';
        if (fre >= 60) return 'Standard';
        if (fre >= 50) return 'Fairly Difficult';
        if (fre >= 30) return 'Difficult';
        return 'Very Difficult';
    }

    function getEducationalStage(avgGradeLevel) {
        if (avgGradeLevel <= 3) return 'Early Elementary';
        if (avgGradeLevel <= 6) return 'Upper Elementary / Early Middle';
        if (avgGradeLevel <= 9) return 'Middle / Early High';
        if (avgGradeLevel <= 12) return 'High School';
        return 'College / Adult';
        }

    function getAgeRangeRecommendation(avgGradeLevel) {
        const minAge = Math.max(6, Math.round(avgGradeLevel + 4));
        const maxAge = Math.round(avgGradeLevel + 7);
        return `${minAge}–${maxAge}`;
    }

    function getEducationalContext(avgGradeLevel, difficultyLevel) {
        if (avgGradeLevel <= 3) return 'Perfect for early elementary students learning to read independently.';
        if (avgGradeLevel <= 6) return 'Ideal for elementary to middle school students.';
        if (avgGradeLevel <= 9) return 'Appropriate for middle to high school students.';
        if (avgGradeLevel <= 12) return 'Suitable for high school students and above.';
        return `College-level content requiring advanced reading skills (${difficultyLevel}).`;
    }

    function scoreRow(name, value) {
        const v = (typeof value === 'number' && isFinite(value)) ? value.toFixed(1) : '—';
        return `<div class="score-item"><span class="score-name">${name}</span><span class="score-value">${v}</span></div>`;
    }
});
