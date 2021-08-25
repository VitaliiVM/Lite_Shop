function sendLogin() {
    let loginVal = document.querySelector('#login').value;
    let passwordVal = document.querySelector('#password').value;
    fetch('/login', {
        method: 'POST',
        body: JSON.stringify({
            'login': loginVal,
            'password': passwordVal
        }),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    })
}

document.querySelector('form').onsubmit = function (event) {
    event.preventDefault();
    sendLogin();
}