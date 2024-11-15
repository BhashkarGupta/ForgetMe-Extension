const masterPassword = document.getElementById('masterPassword');
const domain = document.getElementById('domain');
const passwordLength = document.getElementById('passwordLength');
const advancedOptionsToggle = document.getElementById('advancedOptionsToggle');
const advancedOptions = document.getElementById('advancedOptions');
const customizeOptionsToggle = document.getElementById('customizeOptionsToggle');
const customizeOptions = document.getElementById('customizeOptions');
const generatedPassword = document.getElementById('generatedPassword');

// Event listeners

document.getElementById('masterPassword').addEventListener('input', (event) => {
    updatePasswordStrength(event.target.value);
});

document.getElementById('downloadConfigSubmit').addEventListener('click', (event) => {
    handleDownloadConfig(event);
});

document.getElementById('uploadConfigSubmit').addEventListener('click', (event) => {
    handleUploadConfig(event);
});

document.getElementById('openDownloadConfig').onclick = function () {
    document.getElementById('downloadConfig').style.display = 'block';
}

document.getElementById('closeDownloadConfig').onclick = function () {
    document.getElementById('downloadConfig').style.display = 'none';
}

document.getElementById('openUploadConfig').onclick = function () {
    document.getElementById('uploadConfig').style.display = 'block';
}

document.getElementById('closeUploadConfig').onclick = function () {
    document.getElementById('uploadConfig').style.display = 'none';
}

document.getElementById('saved-configs').onclick = function () {
    document.getElementById('saved-config-popup').style.display = 'block';
    displaySavedDomains();
}

document.getElementById('saved-configs-close').onclick = function () {
    document.getElementById('saved-config-popup').style.display = 'none';
}

document.getElementById('copyButton').onclick = function () {
    navigator.clipboard.writeText(generatedPassword.textContent).then(() => {
        alert("Password copied to clipboard!");
    });
}

// Toggle Advanced Options
advancedOptionsToggle.onclick = () => {
    advancedOptions.style.display = advancedOptions.style.display === 'none' ? 'block' : 'none';
};

// Toggle Customize Options
customizeOptionsToggle.onclick = () => {
    customizeOptions.style.display = customizeOptions.style.display === 'none' ? 'block' : 'none';
};

document.getElementById('darkModeToggle').addEventListener('click', () => {
    toggleDarkMode();
});
if (window.matchMedia('(prefers-color-scheme: dark)')){
    toggleDarkMode();
}
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    document.querySelector('#generatedPassword').classList.toggle('dark-mode');
    document.querySelector('.container').classList.toggle('dark-mode');
    document.querySelector('select').classList.toggle('dark-mode');
    document.querySelector('.saved-config-popup').classList.toggle('dark-mode');
    document.querySelector('.downloadConfig').classList.toggle('dark-mode');
    document.querySelector('.uploadConfig').classList.toggle('dark-mode');
    const labels = document.querySelectorAll('label');
    labels.forEach(label => {
        label.classList.toggle('dark-mode');
    });
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.classList.toggle('dark-mode');
    });
    darkModeToggle.classList.toggle('active');
    const popups = document.querySelectorAll('.howToPopup');
    popups.forEach(popup => {
        popup.classList.toggle('dark-mode');
    })
}

document.getElementById('passwordManagerForm').addEventListener('submit', (event) => { 
    event.preventDefault();
    generatePassword();
});

function handleDownloadConfig(event) {
    event.preventDefault();
    const password = document.getElementById('passwordDownload').value;
    saveConfig(password);
    document.getElementById('downloadConfig').style.display = 'none';
}

function handleUploadConfig(event) {
    event.preventDefault();
    const password = document.getElementById('passwordUpload').value;
    uploadConfig(password);
    document.getElementById('uploadConfig').style.display = 'none';
}

function updatePasswordStrength(password) {
    const strengthText = document.getElementById('passwordStrength');
    const strengthProgress = document.getElementById('strengthProgress');
    let strength = 0;

    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[\W_]/.test(password)) strength += 25;

    // Update the strength text and progress bar
    strengthProgress.value = strength;

    // Remove previous strength classes
    strengthText.classList.remove('weak', 'medium', 'strong');

    if (strength === 0) {
        strengthText.textContent = 'Strength: Weak';
        strengthText.classList.add('weak');
        strengthProgress.className = '';
    } else if (strength < 100) {
        strengthText.textContent = 'Strength: Weak';
        strengthText.classList.add('weak');
        strengthProgress.className = 'progress-weak';
    } else if (strength < 125) {
        strengthText.textContent = 'Strength: Medium';
        strengthText.classList.add('medium');
        strengthProgress.className = 'progress-medium';
    } else {
        strengthText.textContent = 'Strength: Strong';
        strengthText.classList.add('strong');
        strengthProgress.className = 'progress-strong';
    }
}

async function saveConfig(masterPassword) {
    chrome.runtime.sendMessage({ action: 'getConfigs' }, async (response) => {
        const existingConfigs = response.configs || [];
        const encryptedConfigs = await encryptData(JSON.stringify(existingConfigs), masterPassword);
        const configBlob = new Blob([encryptedConfigs], { type: "application/json" });
        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(configBlob);
        downloadLink.download = "ForgetMe.fmpm";
        downloadLink.click();
    });
}

async function uploadConfig(masterPassword) {
    const fileInput = document.getElementById('uploadFile');
    const file = fileInput.files[0];  // Get the first file selected by the user

    if (!file) {
        console.log("No file selected");
        return;
    }

    // handle the file content
    const reader = new FileReader();
    reader.onload = async function (e) {
        const encryptedData = e.target.result;
        console.log("password:", masterPassword);
        console.log(encryptedData);
        const decryptedData = await decryptData(encryptedData, masterPassword);
        async function update(existingConfigs) {
            await chrome.runtime.sendMessage({ action: 'saveConfigs', configs:existingConfigs });
            displaySavedDomains();
        }
        update(JSON.parse(decryptedData));
    };

    // Reading the file as text
    reader.readAsText(file);
}

//Display Domains
let currentPage = 0;  
const itemsPerPage = 2;  
function displaySavedDomains() {
    const domainList = document.getElementById('domainList');
    domainList.innerHTML = '';

    chrome.runtime.sendMessage({ action: 'getConfigs' }, (response) => {
        const existingConfigs = response.configs || [];

        const startIndex = currentPage * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, existingConfigs.length);

        for (let i = startIndex; i < endIndex; i++) {
            const config = existingConfigs[i];
            const li = document.createElement('li');
            const domainName = document.createElement('span');
            domainName.textContent = config.domain;
            li.appendChild(domainName);

            const buttonsContainer = document.createElement('div');
            buttonsContainer.classList.add('buttons-container');

            const loadButton = document.createElement('button');
            loadButton.textContent = "Load";
            loadButton.classList.add('domainList-button', 'load');
            loadButton.onclick = () => loadConfig(i);
            buttonsContainer.appendChild(loadButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = "Delete";
            deleteButton.classList.add('domainList-button', 'delete');
            deleteButton.onclick = (e) => {
                e.stopPropagation(); 
                deleteConfig(i);
            };
            buttonsContainer.appendChild(deleteButton);

            li.appendChild(buttonsContainer);
            li.onclick = () => loadConfig(i);
            domainList.appendChild(li);
        }

        const paginationContainer = document.createElement('div');
        paginationContainer.classList.add('pagination-container');

        const prevButton = document.createElement('button');
        prevButton.textContent = "<";
        prevButton.disabled = currentPage === 0; 
        prevButton.onclick = () => {
            if (currentPage > 0) {
                currentPage--;
                displaySavedDomains(); 
            }
        };
        paginationContainer.appendChild(prevButton);

        const nextButton = document.createElement('button');
        nextButton.textContent = ">";
        nextButton.disabled = endIndex >= existingConfigs.length;  
        nextButton.onclick = () => {
            if (endIndex < existingConfigs.length) {
                currentPage++;
                displaySavedDomains(); 
            }
        };
        paginationContainer.appendChild(nextButton);

        domainList.appendChild(paginationContainer);
    });
}


function deleteConfig(index) {
    console.log("delete Triggered");
    chrome.runtime.sendMessage({action: 'getConfigs'}, (response) => {
        const existingConfigs = response.configs || [];
        existingConfigs.splice(index, 1);
        async function update(existingConfigs) {
            await chrome.runtime.sendMessage({action: 'saveConfigs', configs: existingConfigs});
            displaySavedDomains();
        }
        update(existingConfigs);
    });  
}

function loadConfig(index) {
    chrome.runtime.sendMessage({ action: 'getConfigs' }, (response) => {
        const existingConfigs = response.configs || [];
        const config = existingConfigs[index];

        // Load the configuration into the input fields
        document.getElementById('domain').value = config.domain;
        document.getElementById('username').value = config.username;
        document.getElementById('name').value = config.name;
        document.getElementById('customString').value = config.customString;
        document.getElementById('month').value = config.month;
        document.getElementById('year').value = config.year;
        document.getElementById('passwordLength').value = config.passwordLength;
        document.getElementById('enforceSelection').checked = config.enforceCharTypes;

        document.getElementById('numbers').checked = config.charSet.numbers;
        document.getElementById('lowercase').checked = config.charSet.lowercase;
        document.getElementById('uppercase').checked = config.charSet.uppercase;
        document.getElementById('symbols').checked = config.charSet.symbols;
        document.getElementById('complexSymbols').checked = config.charSet.complexSymbols;

        //close the popup
        document.getElementById('saved-config-popup').style.display = 'none';
    });
}

// Search functionality
let searchPage = 0;
document.getElementById('searchInput').addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    const domainList = document.getElementById('domainList');

    chrome.runtime.sendMessage({ action: 'getConfigs' }, (response) => {
        const existingConfigs = response.configs || [];

        const filteredConfigs = existingConfigs.filter(config => 
            config.domain.toLowerCase().includes(searchTerm)
        );

        const itemsPerPage = 2;
        const startIndex = searchPage * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredConfigs.length);

        domainList.innerHTML = ''; 

        for (let i = startIndex; i < endIndex; i++) {
            const config = filteredConfigs[i];
            const li = document.createElement('li');
            const domainName = document.createElement('span');
            domainName.textContent = config.domain;
            li.appendChild(domainName);

            const buttonsContainer = document.createElement('div');
            buttonsContainer.classList.add('buttons-container');

            const loadButton = document.createElement('button');
            loadButton.textContent = "Load";
            loadButton.classList.add('domainList-button', 'load');
            loadButton.onclick = () => loadConfig(i);
            buttonsContainer.appendChild(loadButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = "Delete";
            deleteButton.classList.add('domainList-button', 'delete');
            deleteButton.onclick = (e) => {
                e.stopPropagation(); // Prevent triggering loadConfig
                deleteConfig(i);
            };
            buttonsContainer.appendChild(deleteButton);

            li.appendChild(buttonsContainer);
            li.onclick = () => loadConfig(i);
            domainList.appendChild(li);
        }

        const paginationContainer = document.createElement('div');
        paginationContainer.classList.add('pagination-container');

        const prevButton = document.createElement('button');
        prevButton.textContent = "<";
        prevButton.disabled = searchPage === 0;
        prevButton.onclick = () => {
            if (searchPage > 0) {
                searchPage--;
                displaySearchResults(); 
            }
        };
        paginationContainer.appendChild(prevButton);

        const nextButton = document.createElement('button');
        nextButton.textContent = ">";
        nextButton.disabled = endIndex >= filteredConfigs.length;
        nextButton.onclick = () => {
            if (endIndex < filteredConfigs.length) {
                searchPage++;
                displaySearchResults(); 
            }
        };
        paginationContainer.appendChild(nextButton);

        domainList.appendChild(paginationContainer);
    });
});
function displaySearchResults() {
    const event = new Event('input');
    document.getElementById('searchInput').dispatchEvent(event);
}

// User function: Generates the initial JSON structure
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

async function generatePassword() {
    try {
        const masterPassword = document.getElementById('masterPassword').value;
        const domain = document.getElementById('domain').value;
        const username = document.getElementById('username').value;
        const name = document.getElementById('name').value;
        const customString = document.getElementById('customString').value;
        const month = document.getElementById('month').value;
        const year = document.getElementById('year').value;
        const passwordLength = parseInt(document.getElementById('passwordLength').value, 10);

        const userJson = userFunction(domain, username, name, customString, month, year, passwordLength, {
            numbers: document.getElementById('numbers').checked,
            lowercase: document.getElementById('lowercase').checked,
            uppercase: document.getElementById('uppercase').checked,
            symbols: document.getElementById('symbols').checked,
            complexSymbols: document.getElementById('complexSymbols').checked
        }, document.getElementById('enforceSelection').checked);

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
        generatedPassword.textContent = password;

        // saving site configuration
        await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                {
                    action: 'saveSiteConfiguration',
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

    } catch (error) {
        console.error(error.message);
        alert(error.message);
    }
}

// Encrypt Data
async function encryptData(data, masterPassword) {
    const encoder = new TextEncoder();
    const masterPasswordHash = await crypto.subtle.digest('SHA-256', encoder.encode(masterPassword));
    const halfHash = masterPasswordHash.slice(0, masterPasswordHash.byteLength / 2);

    const iv = crypto.getRandomValues(new Uint8Array(12)); // Initialization vector
    const key = await crypto.subtle.importKey(
        'raw',
        halfHash,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );

    const encryptedData = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv
        },
        key,
        encoder.encode(data)
    );

    const combined = new Uint8Array(iv.byteLength + encryptedData.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.byteLength);

    return btoa(String.fromCharCode(...combined)); // Convert to base64 for storage
}

// Decrypt Data
async function decryptData(data, masterPassword) {
    const combined = new Uint8Array(atob(data).split("").map(c => c.charCodeAt(0)));
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    const encoder = new TextEncoder();
    const masterPasswordHash = await crypto.subtle.digest('SHA-256', encoder.encode(masterPassword));
    const halfHash = masterPasswordHash.slice(0, masterPasswordHash.byteLength / 2);

    const key = await crypto.subtle.importKey(
        'raw',
        halfHash,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
    );

    const decryptedData = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: iv
        },
        key,
        encryptedData
    );

    return new TextDecoder().decode(decryptedData);
}