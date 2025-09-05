// Wait for everything to load
window.onload = function() {
    console.log('Window fully loaded');
    
    // Find elements
    const fileInput = document.getElementById('fileInput');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    
    console.log('File input found:', fileInput);
    
    if (!fileInput) {
        alert('File input not found!');
        return;
    }
    
    // File handler with processing
    fileInput.onchange = function(e) {
        console.log('File change detected');
        const file = e.target.files[0];
        if (file) {
            console.log('File selected:', file.name);
            processFile(file);
        }
    };
    
    function processFile(file) {
        console.log('Starting to process file:', file.name);
        
        // Show loading
        if (loading) loading.classList.add('show');
        if (results) results.innerHTML = '';
        
        // Check if JSZip is available
        if (typeof JSZip === 'undefined') {
            alert('JSZip library not loaded');
            return;
        }
        
        const zip = new JSZip();
        
        zip.loadAsync(file).then(function(zipContent) {
            console.log('ZIP loaded, found', Object.keys(zipContent.files).length, 'files');
            
            const langFiles = [];
            const filePromises = [];
            
            // Find .lang files
            zipContent.forEach(function(relativePath, file) {
                if (relativePath.toLowerCase().endsWith('.lang') && !file.dir) {
                    console.log('Found .lang file:', relativePath);
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
                alert('No .lang files found in the archive');
                return;
            }
            
            console.log('Processing', filePromises.length, '.lang files');
            
            return Promise.all(filePromises);
            
        }).then(function(allLangFiles) {
            console.log('All .lang files processed');
            
            // Find largest file
            const largestFile = allLangFiles.reduce((prev, current) => 
                (prev.size > current.size) ? prev : current
            );
            
            console.log('Largest file:', largestFile.path, largestFile.size, 'characters');
            
            // Simple display for now
            if (results) {
                results.innerHTML = `
                    <div class="analysis-section">
                        <h2>Analysis Complete</h2>
                        <p><strong>Largest Language File:</strong> ${largestFile.path}</p>
                        <p><strong>Size:</strong> ${largestFile.size} characters</p>
                        <p><strong>Total .lang files:</strong> ${allLangFiles.length}</p>
                    </div>
                `;
            }
            
            // Hide loading
            if (loading) loading.classList.remove('show');
            
        }).catch(function(error) {
            console.error('Error processing file:', error);
            alert('Error processing file: ' + error.message);
            if (loading) loading.classList.remove('show');
        });
    }
    
    console.log('Setup complete');
};
