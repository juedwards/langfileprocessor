// Wait for everything to load
window.onload = function() {
    console.log('Window fully loaded');
    
    // Find elements
    const fileInput = document.getElementById('fileInput');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    
    if (!fileInput) {
        alert('File input not found!');
        return;
    }
    
    // File handler with full processing
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            processFile(file);
        }
    };
    
    function processFile(file) {
        console.log('Processing:', file.name);
        
        if (loading) loading.classList.add('show');
        if (results) results.innerHTML = '';
        
        if (typeof JSZip === 'undefined') {
            alert('JSZip library not loaded');
            return;
        }
        
        const zip = new JSZip();
        
        zip.loadAsync(file).then(function(zipContent) {
            const filePromises = [];
            
            zipContent.forEach(function(relativePath, file) {
                if (relativePath.toLowerCase().endsWith('.lang') && !file.dir) {
                    filePromises.push(
                        file.async('text').then(content => ({
                            path: relativePath,
                            content: content,
                            size: content.length
                        }))
                    );
                }
            });
            
            if (filePromises.length === 0) {
                throw new Error('No language files found');
            }
            
            return Promise.all(filePromises);
            
        }).then(function(allLangFiles) {
            // Find largest file
            const largestFile = allLangFiles.reduce((prev, current) => 
                (prev.size > current.size) ? prev : current
            );
            
            // Extract readable text
            const extractedText = extractReadableText(largestFile.content);
            
            // Calculate readability scores
            const scores = calculateReadabilityScores(extractedText);
            
            if (!scores) {
                throw new Error('Could not calculate readability scores');
            }
            
            // Display full analysis
            displayResults(largestFile, extractedText, scores, allLangFiles.length);
            
            if (loading) loading.classList.remove('show');
            
        }).catch(function(error) {
            console.error('Error:', error);
            if (results) {
                results.innerHTML = '<div class="error">Error: ' + error.message + '</div>';
            }
            if (loading) loading.classList.remove('show');
        });
    }
    
    function extractReadableText(langContent) {
        const lines = langContent.split('\n');
        const readableTexts = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                const [key, value] = trimmed.split('=', 2);
                if (value) {
                    let cleanText = value.trim()
                        .replace(/\u00a7[0-9a-fk-or]/g, '')
                        .replace(/\\n/g, ' ')
                        .replace(/###{[^}]*}/g, '')
                        .replace(/##+/g, '')
                        .replace(/:{2,}/g, '')
                        .replace(/~{2,}/g, '')
                        .replace(/_{2,}/g, '')
                        .replace(/:{[^}]*}:/g, '')
                        .replace(/\{[^}]*\}/g, '')
                        .replace(/\[[^\]]*\]/g, '')
                        .replace(/\([^\)]*\)/g, '')
                        .replace(/[#$%^&*+=<>|\\]/g, '')
                        .replace(/\s+/g, ' ')
                        .trim();
                    
                    if (cleanText && 
                        cleanText.length > 3 && 
                        /[a-zA-Z]/.test(cleanText) && 
                        !/^\d+\.?\d*$/.test(cleanText) && 
                        !cleanText.match(/^[^a-zA-Z0-9\s]+$/) && 
                        cleanText.split(' ').length >= 2) {
                        readableTexts.push(cleanText);
                    }
                }
            }
        }

        return readableTexts.join(' ');
    }
    
    function calculateReadabilityScores(text) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = text.split(/\s+/).filter(w => w.length > 0);
        const characters = text.replace(/\s/g, '').length;
        
        const sentenceCount = sentences.length;
        const wordCount = words.length;
        const characterCount = characters;
        
        if (sentenceCount === 0 || wordCount === 0) {
            return null;
        }

        const syllableCounts = words.map(word => countSyllables(word));
        const totalSyllables = syllableCounts.reduce((sum, count) => sum + count, 0);
        const complexWords = words.filter(word => countSyllables(word) >= 3).length;

        const avgWordsPerSentence = wordCount / sentenceCount;
        const avgSyllablesPerWord = totalSyllables / wordCount;
        const avgCharsPerWord = characterCount / wordCount;

        const scores = {};

        scores.fleschReadingEase = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
        scores.fleschReadingEase = Math.max(0, Math.min(100, scores.fleschReadingEase));

        scores.fleschKincaidGrade = (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59;
        scores.fleschKincaidGrade = Math.max(0, scores.fleschKincaidGrade);

        const complexWordPercentage = (complexWords / wordCount) * 100;
        scores.gunningFog = 0.4 * (avgWordsPerSentence + complexWordPercentage);

        if (sentenceCount >= 3) {
            scores.smogIndex = 1.043 * Math.sqrt(complexWords * (30 / sentenceCount)) + 3.1291;
        } else {
            scores.smogIndex = scores.gunningFog;
        }

        const avgCharsPerHundredWords = (characterCount / wordCount) * 100;
        const avgSentencesPerHundredWords = (sentenceCount / wordCount) * 100;
        scores.colemanLiau = (0.0588 * avgCharsPerHundredWords) - (0.296 * avgSentencesPerHundredWords) - 15.8;

        scores.automatedReadability = (4.71 * avgCharsPerWord) + (0.5 * avgWordsPerSentence) - 21.43;

        const easyWords = words.filter(word => countSyllables(word) <= 2).length;
        const hardWords = wordCount - easyWords;
        scores.linsearWrite = ((easyWords + (hardWords * 3)) / sentenceCount);
        if (scores.linsearWrite > 20) {
            scores.linsearWrite = scores.linsearWrite / 2;
        } else {
            scores.linsearWrite = (scores.linsearWrite - 2) / 2;
        }

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

        return scores;
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
        
        if (word.endsWith('e') && syllables > 1) {
            syllables--;
        }
        
        return Math.max(1, syllables);
    }

    // Azure GPT integration
async function getGptAnalysis(languageSummary) {
    // Point to your Node.js backend (adjust port if needed)
    const endpoint = "http://localhost:3000/analyze";
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ summary: languageSummary })
        });
        const data = await response.json();
        return data.result || "No analysis returned.";
    } catch (error) {
        return `Error calling backend: ${error.message}`;
    }
}

    // Helper to produce a summary for the AI
    function generateAnalysisSummary(scores, totalFiles) {
        return `Total files: ${totalFiles}
Sentences: ${scores.stats.sentences}
Words: ${scores.stats.words}
Complex Words: ${scores.stats.complexWords}
Flesch Reading Ease: ${scores.fleschReadingEase.toFixed(1)}
Flesch-Kincaid Grade: ${scores.fleschKincaidGrade.toFixed(1)}
Gunning Fog Index: ${scores.gunningFog.toFixed(1)}
SMOG Index: ${scores.smogIndex.toFixed(1)}
Coleman-Liau Index: ${scores.colemanLiau.toFixed(1)}
Automated Readability: ${scores.automatedReadability.toFixed(1)}
Linsear Write: ${scores.linsearWrite.toFixed(1)}
`;
    }

    // --- update displayResults ---
    function displayResults(largestFile, extractedText, scores, totalFiles) {
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
        
        let difficultyLevel = "Standard";
        if (scores.fleschReadingEase >= 90) difficultyLevel = "Very Easy";
        else if (scores.fleschReadingEase >= 80) difficultyLevel = "Easy";
        else if (scores.fleschReadingEase >= 70) difficultyLevel = "Fairly Easy";
        else if (scores.fleschReadingEase >= 60) difficultyLevel = "Standard";
        else if (scores.fleschReadingEase >= 50) difficultyLevel = "Fairly Difficult";
        else if (scores.fleschReadingEase >= 30) difficultyLevel = "Difficult";
        else difficultyLevel = "Very Difficult";

        const html = `
            <div class="analysis-section">
                <h2 class="section-title">Analysis Summary</h2>
                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-value">${totalFiles}</div><div class="stat-label">Total Language Files</div></div>
                    <div class="stat-card"><div class="stat-value">${scores.stats.sentences}</div><div class="stat-label">Sentences</div></div>
                    <div class="stat-card"><div class="stat-value">${scores.stats.words}</div><div class="stat-label">Words</div></div>
                    <div class="stat-card"><div class="stat-value">${scores.stats.complexWords}</div><div class="stat-label">Complex Words</div></div>
                </div>
            </div>

            <div class="analysis-section">
                <h2 class="section-title">Readability Scores</h2>
                <div class="readability-scores">
                    <div class="score-item"><span class="score-name">Flesch Reading Ease</span><span class="score-value">${scores.fleschReadingEase.toFixed(1)}</span></div>
                    <div class="score-item"><span class="score-name">Flesch-Kincaid Grade</span><span class="score-value">${scores.fleschKincaidGrade.toFixed(1)}</span></div>
                    <div class="score-item"><span class="score-name">Gunning Fog Index</span><span class="score-value">${scores.gunningFog.toFixed(1)}</span></div>
                    <div class="score-item"><span class="score-name">SMOG Index</span><span class="score-value">${scores.smogIndex.toFixed(1)}</span></div>
                    <div class="score-item"><span class="score-name">Coleman-Liau Index</span><span class="score-value">${scores.colemanLiau.toFixed(1)}</span></div>
                    <div class="score-item"><span class="score-name">Automated Readability</span><span class="score-value">${scores.automatedReadability.toFixed(1)}</span></div>
                    <div class="score-item"><span class="score-name">Linsear Write</span><span class="score-value">${scores.linsearWrite.toFixed(1)}</span></div>
                </div>
            </div>

            <div class="analysis-section">
                <h2 class="section-title">Reading Level Interpretation</h2>
                <div class="readability-interpretation">
                    <div class="interpretation-section">
                        <h4>Reading Level Summary</h4>
                        <p><strong>Overall Difficulty:</strong> ${difficultyLevel} (Flesch Reading Ease: ${scores.fleschReadingEase.toFixed(1)})</p>
                        <p><strong>Average Grade Level:</strong> ${avgGradeLevel.toFixed(1)} (approximately ${avgAge} years old)</p>
                    </div>
                    <div class="interpretation-section">
                        <h4>Recommendations</h4>
                        <p><strong>Best suited for:</strong> Ages ${Math.max(6, Math.round(avgGradeLevel + 4))}-${Math.round(avgGradeLevel + 7)}</p>
                        <p><strong>Educational Context:</strong> ${avgGradeLevel <= 6 ? 'Ideal for elementary to middle school students.' : 'Appropriate for middle school and above.'}</p>
                    </div>
                </div>
            </div>

            <div class="analysis-section">
                <h2 class="section-title">AI-Powered Analysis</h2>
                <button id="aiAnalyzeBtn" class="ai-btn">Generate Detailed AI Analysis</button>
                <div id="aiAnalysisResult" class="ai-analysis-result"></div>
            </div>
        `;

        if (results) {
            results.innerHTML = html;

            // Attach click handler for AI analysis button
            const aiBtn = document.getElementById('aiAnalyzeBtn');
            const aiResult = document.getElementById('aiAnalysisResult');
            if (aiBtn && aiResult) {
                aiBtn.onclick = async function() {
                    aiBtn.disabled = true;
                    aiResult.innerHTML = '<div class="loading">Analyzing with Azure GPT-4o...</div>';
                    const summary = generateAnalysisSummary(scores, totalFiles);
                    const analysis = await getGptAnalysis(summary);
                    aiResult.innerHTML = `<div class="ai-analysis-content">${analysis.replace(/\n/g, '<br>')}</div>`;
                    aiBtn.disabled = false;
                };
            }
        }
    }
};
