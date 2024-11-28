console.log('content.js triggered');

// Poll the DOM periodically to check if the username and password fields are available
function startPolling() {
    const pollingInterval = 500; 
    const maxAttempts = 10; 
    let attemptCount = 0;

    const checkFieldsInterval = setInterval(function() {
        const usernameField = document.querySelector('input[name="username"], input[type="email"], input[type="text"]');
        const passwordField = document.querySelector('input[name="password"], input[type="password"]');
        
        if (usernameField && passwordField) {
            // Both fields are found, stop polling
            console.log('Login form detected');
            addIconToInputFields(); // Add icon when fields are detected
            clearInterval(checkFieldsInterval); // Stop polling once fields are detected
        }
        
        attemptCount++;
        if (attemptCount >= maxAttempts) {
            // Stop polling after reaching the maximum attempts
            console.log('Max attempts reached without detecting login fields');
            clearInterval(checkFieldsInterval); // Stop polling to avoid unnecessary checks
        }
    }, pollingInterval);
}

startPolling();

function addIconToInputFields() {
    const buttonHtml = `
        <button type="button" class="password-generator-btn" style="
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background-color: transparent;
            border: none;
            cursor: pointer;
            font-size: 16px;
            color: #666;
            z-index: 10;
        " title="Generate Password">
            🔑
        </button>
    `;

    const inputs = document.querySelectorAll('input[type="password"], input[type="text"], input[type="email"]');

    inputs.forEach(input => {
        // Check if the input is visible
        if (isElementVisible(input)) {
            // Create a container element to hold the input and the button
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.style.display = 'inline-block';

            // Insert the wrapper before the input in the DOM
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input); // Move the input into the wrapper

            // Insert the button into the wrapper
            const button = document.createElement('div');
            button.innerHTML = buttonHtml;
            wrapper.appendChild(button);

            // Add click event listener to the button
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                fillPassword();
            });

            // Only show the icon after user interaction with the input
            input.addEventListener('focus', () => {
                button.style.display = 'block'; // Show the icon when the field is focused
            });

            input.addEventListener('blur', () => {
                button.style.display = 'none'; // Hide the icon when focus is lost
            });
        }
    });
}

function isElementVisible(element) {
    // Check if the element is visible (not hidden or display:none)
    const style = window.getComputedStyle(element);
    
    // Check if the element is not hidden
    if (style.display === 'none' || style.visibility === 'hidden') {
        return false;
    }

    // Check if the element is in the viewport (not off-screen)
    const rect = element.getBoundingClientRect();
    if (rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth) {
        return true;
    }
    
    // Additional check for elements with "moveOffScreen" class or similar off-screen properties
    if (style.position === 'fixed' || style.transform) {
        const transformMatrix = style.transform.match(/matrix.*\((.+)\)/);
        if (transformMatrix) {
            const transformValues = transformMatrix[1].split(',').map(val => parseFloat(val));
            const translateX = transformValues[4] || 0;
            const translateY = transformValues[5] || 0;
            if (translateX || translateY) {
                return false; // The element is visually off-screen
            }
        }
    }

    return element.offsetHeight > 0 && element.offsetWidth > 0;
}


function fillPassword() {
    chrome.runtime.sendMessage({ action: 'getConfigs' }, async function (response) {
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
    console.log('fillPasswordTriggered');

    async function autofillLoginForm(userName, password) {
        const usernameField = document.querySelector('input[name="username"], input[type="email"], input[type="text"]');
        const passwordField = document.querySelector('input[name="password"], input[type="password"]');

        if (usernameField || passwordField) {
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
}

