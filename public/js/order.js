document.querySelector('#lite-shop-order').onsubmit = function (event) {
    event.preventDefault();
    let username = document.querySelector('#username').value.trim();
    let phone = document.querySelector('#phone').value.trim();
    let email = document.querySelector('#email').value.trim();
    let address = document.querySelector('#address').value.trim();

    if (!document.querySelector('#rule').checked) {
        Swal.fire({
            title: 'Warning',
            text: 'Read and accept the rule',
            type: 'info',
            confirmButtonText: 'Ok'
        });
        return false;
    }
    if (username == '' || phone == '' || email == '' || address == '') {
        Swal.fire({
            title: 'Warning',
            text: 'Fill all fields',
            type: 'info',
            confirmButtonText: 'Ok'
        });
        return false;
    }

    fetch('/finish-order', {
        method: 'POST',
        body: JSON.stringify({
            'username': username,
            'email': email,
            'phone': phone,
            'address': address,
            'key': JSON.parse(localStorage.getItem('cart'))
        }),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    })
        .then(function (response) {
            return response.text();
        })
        .then(function (body) {
            if (body == 1) {
                Swal.fire({
                    title: 'Success',
                    text: 'You have success',
                    type: 'info',
                    confirmButtonText: 'Ok'
                });
            } else {
                Swal.fire({
                    title: 'Problem with mail',
                    text: 'Error',
                    type: 'error',
                    confirmButtonText: 'Ok'
                });
            }
        })
}