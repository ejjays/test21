const settingsIcon = document.getElementById('settings-icon');
const settingsPanel = document.getElementById('settings-panel');
const backButton = document.getElementById('back-button');

// UI and control logic
document.addEventListener('DOMContentLoaded', () => {
    settingsIcon.addEventListener('click', () => {
        settingsPanel.classList.toggle('open');
    });

    backButton.addEventListener('click', () => {
        settingsPanel.classList.remove('open');
    });
});