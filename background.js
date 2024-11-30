// Retrieve a password from chrome.storage
async function getPassword(domain) {
    const passwords = await getPasswords();
    return passwords[domain] ? passwords[domain] : null;
}

// Helper function to get passwords from storage
async function getPasswords() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['passwords'], (result) => {
            resolve(result.passwords || {});
        });
    });
}

// Generate User String Function: Combines the relevant fields into one string
function generateUserString(userJson) {
    let combinedString = "";

    if (userJson.domain) combinedString += userJson.domain;
    if (userJson.username) combinedString += userJson.username;
    if (userJson.name) combinedString += userJson.name;
    if (userJson.customString) combinedString += userJson.customString;
    if (userJson.month) combinedString += userJson.month;
    if (userJson.year) combinedString += userJson.year;

    return {
        finalString: combinedString,
        passwordLength: userJson.passwordLength,
        enforceCharTypes: userJson.enforceCharTypes,
        charSet: userJson.charSet
    };
}

// Generate Password Function: Uses the master password and the final JSON to generate a password
async function generatePasswordFromHash(masterPassword, finalJson) {
    const encoder = new TextEncoder();
    const masterPasswordHash = await crypto.subtle.digest('SHA-256', encoder.encode(masterPassword));

    const combinedInput = new Uint8Array([...new Uint8Array(masterPasswordHash), ...encoder.encode(finalJson.finalString)]);
    const finalHash = await crypto.subtle.digest('SHA-256', combinedInput);

    let characterSet = "";
    const numbers = "0123456789";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const symbols = "!@#$%^&*()";
    const complexSymbols = "[]{}<>?|";

    let selectedCharSets = [];
    if (finalJson.charSet.numbers) {
        characterSet += numbers;
        selectedCharSets.push(numbers);
    }
    if (finalJson.charSet.uppercase) {
        characterSet += uppercase;
        selectedCharSets.push(uppercase);
    }
    if (finalJson.charSet.lowercase) {
        characterSet += lowercase;
        selectedCharSets.push(lowercase);
    }
    if (finalJson.charSet.symbols) {
        characterSet += symbols;
        selectedCharSets.push(symbols);
    }
    if (finalJson.charSet.complexSymbols) {
        characterSet += complexSymbols;
        selectedCharSets.push(complexSymbols);
    }

    let password = "";
    const hashArray = new Uint8Array(finalHash);
    const hashLength = hashArray.length;

    for (let i = 0; i < finalJson.passwordLength; i++) {
        const byte = hashArray[i % hashLength];
        const randomIndex = byte % characterSet.length;
        password += characterSet[randomIndex];
    }

    if (finalJson.enforceCharTypes) {
        const numTypesToEnforce = selectedCharSets.length;
        let positions = [];

        for (let count = 0; count < hashLength; count++) {
            let position = hashArray[count] % finalJson.passwordLength;
            if (!positions.includes(position)) {
                positions.push(position);
            }
        }

        for (let i = 0; i < numTypesToEnforce; i++) {
            const charSet = selectedCharSets[i];
            const byte = hashArray[(i + numTypesToEnforce) % hashLength];
            const charIndex = byte % charSet.length;
            const character = charSet[charIndex];

            const position = positions[i];
            password = password.substring(0, position) + character + password.substring(position + 1);
        }
    }
    return password;
}

function saveSiteConfiguration(userJson) {
    chrome.storage.local.get(['configs'], (result) => {
        const existingConfigs = result.configs || [];
        const userJsonString = JSON.stringify(userJson);
        const configExists = existingConfigs.some(config => JSON.stringify(config) === userJsonString);

        if (configExists) {
            console.log("This configuration already exists. Not saving again.");
        } else {
            existingConfigs.push(userJson);
            chrome.storage.local.set({ configs: existingConfigs }, () => {
                console.log("New configuration saved.");
            });
        }
    });
}

// Function to fetch stored configurations from chrome.storage.local
function getConfigsFromStorage(callback) {
    chrome.storage.local.get('configs', (result) => {
        const existingConfigs = result.configs || [];
        callback(existingConfigs);
    });
}

// Function to save configurations to chrome.storage.local
function saveConfigsToStorage(configs, callback) {
    chrome.storage.local.set({ configs: configs }, () => {
        if (callback) {
            callback(); // Optionally run a callback after saving
        }
    });
}

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'generatePasswordFromHash') {
        const { masterPassword, userJson } = message;
        generatePasswordFromHash(masterPassword, generateUserString(userJson))
            .then(password => {
                sendResponse({ password }); 
            })
            .catch(error => {
                console.error(error);
                sendResponse({ error: error.message });
            });
        return true;
    } else if (message.action === 'getConfigs') {
        getConfigsFromStorage((configs) => {
            sendResponse({ configs: configs });
        });
        return true;
    } else if (message.action === 'saveConfigs') {
        console.log('saved config requested');
        saveConfigsToStorage(message.configs, () => {
            sendResponse({ success: true });
        });
    } else if (message.action === 'saveSiteConfiguration') {
        const { userJson } = message;
        try {
            saveSiteConfiguration(userJson);
            sendResponse({success: true});
        } catch (error) {
            console.error("Error saving configuration:", error);
            sendResponse({ error: error.message });
        }
    }
});



