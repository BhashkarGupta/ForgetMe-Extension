// Query the background script for saved configurations
chrome.runtime.sendMessage({ action: 'getSavedConfigs' }, function(response) {
    if (response && response.configs) {
        const savedConfigs = response.configs;
        const currentUrl = window.location.hostname; // Get the domain of the current page (example.com)
        
        // Try to match the current URL with the saved domains
        const matchedConfig = savedConfigs.find(config => {
            // Compare saved domains with the current domain (hostname)
            return currentUrl.includes(config.domain);
        });

        if (matchedConfig) {
            // If a match is found, autofill the login form
            autofillLoginForm(matchedConfig);
        }
    }
});

// Function to autofill the login form with username and password
function autofillLoginForm(config) {
    // Find the username and password fields in the form
    const usernameField = document.querySelector('input[name="username"], input[type="email"], input[type="text"]');
    const passwordField = document.querySelector('input[name="password"], input[type="password"]');

    if (usernameField && passwordField) {
        // Fill in the saved username and password
        usernameField.value = config.username || '';
        passwordField.value = config.password || ''; // Assuming password is stored in the config

        // Optionally, trigger a submit (if you want to automatically log in)
        // document.querySelector('form').submit();  // Uncomment if you want to auto-submit the form
    } else {
        console.log('No username/password fields found.');
    }
}
