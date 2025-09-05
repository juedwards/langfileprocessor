// Wait for everything to load
window.onload = function() {
    console.log('Window fully loaded');
    
    // Find elements
    const fileInput = document.getElementById('fileInput');
    console.log('File input found:', fileInput);
    
    if (!fileInput) {
        alert('File input not found!');
        return;
    }
    
    // Simple file handler
    fileInput.onchange = function(e) {
        console.log('File change detected');
        const file = e.target.files[0];
        if (file) {
            alert('File selected: ' + file.name);
            console.log('File details:', file);
        }
    };
    
    console.log('Setup complete');
};
