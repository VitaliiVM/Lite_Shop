let cart = {};
document.querySelectorAll('.add-to-cart').forEach(function (element) {
    element.onclick = addToCart;
});

if (localStorage.getItem('cart')) {
    cart = JSON.parse(localStorage.getItem('cart'));
    ajaxGetGoodsInfo();
}

function addToCart() {
    let goodsId = this.dataset.goods_id;
    if (cart[goodsId]) {
        cart[goodsId]++;
    } else {
        cart[goodsId] = 1;
    }
    console.log(cart);
    ajaxGetGoodsInfo();
}

function ajaxGetGoodsInfo() {
    apdateLocalStorageCart();
    fetch('/get-goods-info', {
        method: 'POST',
        body: JSON.stringify({key: Object.keys(cart)}),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    })
        .then(function (response) {
            return response.text();
        })
        .then(function (body) {
            console.log(body);
            showCart(JSON.parse(body));
        })
}

function showCart(data) {
    let out = '<table class="table table-striped table-cart"><tbody>';
    let total = 0;
    for (let key in cart) {
        out += `<tr><td colspan="4"><a href="/goods?id=${key}">${data[key]['name']}</a></tr>`;
        out += `<tr><td><i class="far fa-minus-square cart-minus" data-goods_id="${key}"></i></td>`;
        out += `<td>${cart[key]}</td>`;
        out += `<td><i class="far fa-plus-square cart-plus" data-goods_id="${key}"></i></td>`;
        out += `<td>${formatPrice(data[key]['cost'] * cart[key])} uah </td>`;
        out += '</tr>';
        total += cart[key] * data[key]['cost'];
    }
    out += `<tr><td colspan="3">Total: </td><td>${formatPrice(total)} uah</td></tr>`;
    out += '</tbody></table>';
    document.querySelector('#cart-nav').innerHTML = out;
    document.querySelectorAll('.cart-minus').forEach(function (element) {
        element.onclick = cartMinus;
    });
    document.querySelectorAll('.cart-plus').forEach(function (element) {
        element.onclick = cartPlus;
    });
}

function cartPlus() {
    let goodsId = this.dataset.goods_id;
    cart[goodsId]++;
    ajaxGetGoodsInfo();
}

function cartMinus() {
    let goodsId = this.dataset.goods_id;
    if (cart[goodsId] - 1 > 0) {
        cart[goodsId]--;
    } else {
        delete (cart[goodsId]);
    }
    ajaxGetGoodsInfo();
}

function apdateLocalStorageCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function formatPrice(price) {
    return price.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$& ');
}







