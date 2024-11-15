// Query the background script for saved configurations
chrome.runtime.sendMessage({ action: 'getConfigs' }, async function(response) {
    if (response && response.configs) {
        const savedConfigs = response.configs;
        const currentUrl = window.location.hostname;
        const matchedConfig = savedConfigs.find(config => {
            return currentUrl.includes(config.domain);
        });

        if (matchedConfig) {
            getPassword(matchedConfig);
        }
    }
});

// Function to autofill the login form with username and password
async function autofillLoginForm(userName, password) {
    const usernameField = document.querySelector('input[name="username"], input[type="email"], input[type="text"]');
    const passwordField = document.querySelector('input[name="password"], input[type="password"]');

    if (usernameField && passwordField) {
        usernameField.value = userName || '';
        passwordField.value = password; 
    } else {
        console.log('No username/password fields found.');
    }
}


async function generatePassword(config, pass) {
    try {
        const masterPassword = pass;
        const domain = config.domain;
        const username = config.username;
        const name = config.name;
        const customString = config.customString;
        const month = config.month;
        const year = config.year;
        const passwordLength = config.passwordLength;

        const userJson = userFunction(domain, username, name, customString, month, year, passwordLength, {
            numbers: config.charSet.numbers,
            lowercase: config.charSet.lowercase,
            uppercase: config.charSet.uppercase,
            symbols: config.charSet.symbols,
            complexSymbols: config.charSet.complexSymbols
        }, config.enforceCharTypes);

        //requesting password generation
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                {
                    action: 'generatePasswordFromHash',
                    masterPassword: masterPassword,
                    userJson: userJson
                },
                (result) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(result);
                    }
                }
            );
        });

        const password = response.password;
        return password;

        // saving site configuration
        // await new Promise((resolve, reject) => {
        //     chrome.runtime.sendMessage(
        //         {
        //             action: 'saveSiteConfiguration',
        //             userJson: userJson
        //         },
        //         (result) => {
        //             if (chrome.runtime.lastError) {
        //                 reject(chrome.runtime.lastError);
        //             } else {
        //                 resolve(result);
        //             }
        //         }
        //     );
        // });

    } catch (error) {
        console.error(error.message);
        alert(error.message);
    }
}

function userFunction(domain, username, name, customString, month, year, passwordLength, charSet, enforceCharTypes) {
    if (!charSet.numbers && !charSet.lowercase && !charSet.uppercase && !charSet.symbols && !charSet.complexSymbols) {
        throw new Error("At least one character set must be selected.");
    }
    if (enforceCharTypes) {
        const numSelectedCharSets = Object.values(charSet).filter(Boolean).length;
        if (passwordLength < numSelectedCharSets) {
            throw new Error("Password length must be at least equal to the number of selected character types when enforcing characters.");
        }
    }
    return {
        charSet: {
            complexSymbols: charSet.complexSymbols || false,
            lowercase: charSet.lowercase !== false,
            numbers: charSet.numbers !== false,
            symbols: charSet.symbols !== false,
            uppercase: charSet.uppercase !== false
        },
        customString: customString || null,
        domain: domain,
        enforceCharTypes: enforceCharTypes || true,
        month: month || null,
        name: name || null,
        passwordLength: passwordLength,
        username: username || null,
        year: year || null
    };    
}

// Function to create and display a password modal
async function getPassword(config) {
    // Create modal elements
    const modal = document.createElement('div');
    const modalContent = document.createElement('div');
    const modalHeader = document.createElement('h2');
    const passwordInput = document.createElement('input');
    const submitButton = document.createElement('button');
    
    // Style the modal (optional)
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';

    modalContent.style.backgroundColor = '#fff';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '5px';
    modalContent.style.textAlign = 'center';

    modalHeader.textContent = 'Enter Your Master Password';
    
    passwordInput.type = 'password';
    passwordInput.placeholder = 'Password';
    passwordInput.style.marginBottom = '10px';
    passwordInput.style.padding = '5px';
    passwordInput.style.borderRadius = '5px';

    submitButton.textContent = 'Submit';
    submitButton.style.padding = '10px 20px';
    submitButton.style.margin = '10px 20px';
    submitButton.style.backgroundColor = '#4CAF50';
    submitButton.style.color = '#fff';
    submitButton.style.border = 'none';
    submitButton.style.cursor = 'pointer';
    submitButton.style.borderRadius = '5px';

    // Append elements to the modal
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(passwordInput);
    modalContent.appendChild(submitButton);
    modal.appendChild(modalContent);
    
    // Add the modal to the document body
    document.body.appendChild(modal);

    // Handle submit button click
    submitButton.addEventListener('click', async () => {
        const masterPassword = passwordInput.value;
        modal.remove();
        const password = await generatePassword(config, masterPassword);
        await autofillLoginForm(config.username, password);
        return password;
    });
}

