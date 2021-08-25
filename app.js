let express = require('express');
let app = express();
let cookieParser = require('cookie-parser');
let admin = require('./admin');
let hashFunc = require('./public/js/hashGenerate');

require('dotenv').config();

app.use(express.static('public'));

app.use(express.json());

app.use(express.urlencoded());

app.use(cookieParser());


const nodemailer = require('nodemailer');
const port = process.env.PORT || 3000;


app.set('view engine', 'pug');

let mysql = require('mysql');
const {response} = require("express");

let con = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB
});

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;


app.listen(port, function () {
    console.log(`Node express work on ${port}`);
});

app.use(function (req, res, next) {
    if (req.originalUrl == '/admin' || req.originalUrl == '/admin-order') {
        admin(req, res, con, next);
    } else {
        next();
    }
})


app.get('/', function (req, res) {

    let cat = new Promise(function (resolve, reject) {
        let queryDB = "select id,name, cost, image, category from (select id,name,cost,image,category, if(if(@curr_category != category, @curr_category := category, '') != '', @k := 0, @k := @k + 1) as ind   from goods, ( select @curr_category := '' ) v ) goods where ind < 3";
        con.query(
            queryDB,
            function (error, result, fields) {
                if (error) return reject(error);
                resolve(result);

            }
        );
    });

    let catDescription = new Promise(function (resolve, reject) {
        let queryDB = "SELECT * FROM category";
        con.query(
            queryDB,
            function (error, result, fields) {
                if (error) return reject(error);
                resolve(result);

            }
        );
    });

    Promise.all([cat, catDescription]).then(function (value) {
        // console.log(value[1]);
        res.render('index', {
            goods: JSON.parse(JSON.stringify(value[0])),
            cat: JSON.parse(JSON.stringify(value[1]))
        });
    });

});


app.get('/cat', function (req, res) {
    // console.log(req.query.id);
    let catId = req.query.id;

    let cat = new Promise(function (resolve, reject) {
        con.query(
            'SELECT * FROM category WHERE id=' + catId,
            function (error, result) {
                if (error) reject(error);
                resolve(result);
            }
        );
    });

    let goods = new Promise(function (resolve, reject) {
        con.query(
            'SELECT * FROM goods WHERE category=' + catId,
            function (error, result) {
                if (error) reject(error);
                resolve(result);
            }
        );
    });

    Promise.all([cat, goods]).then(function (value) {
        // console.log(value[1]);
        res.render('cat', {
            cat: JSON.parse(JSON.stringify(value[0])),
            goods: JSON.parse(JSON.stringify(value[1]))
        })
    });

});

app.get('/goods', function (req, res) {
    let currentDB = 'SELECT * FROM goods WHERE id=' + req.query.id;
    con.query(currentDB, function (err, result, fields) {
        if (err) throw err;
        res.render('goods', {goods: JSON.parse(JSON.stringify(result))});
    });
});

app.get('/order', function (req, res) {
    res.render('order');
})

app.post('/get-category-list', function (req, res) {
    let currentDb = 'SELECT id, category FROM category';
    con.query(currentDb, function (err, result, fields) {
        if (err) throw err;
        // console.log(result);
        res.json(result);
    });
})

app.post('/get-goods-info', function (req, res) {
    // console.log(req.body.key);
    if (req.body.key.length != 0) {
        let bodyKey = 'SELECT id,name,cost FROM goods WHERE id IN (' + req.body.key.join(',') + ')';
        con.query(bodyKey, function (err, result, fields) {
            if (err) throw err;
            console.log(result);
            let goods = {};
            for (let i = 0; i < result.length; i++) {
                goods[result[i]['id']] = result[i];
            }
            res.json(goods);
        });
    } else {
        res.send('0');
    }
})

app.post('/finish-order', function (req, res) {
    // console.log(req.body);
    if (req.body.key.length != 0) {
        let key = Object.keys(req.body.key);
        let bodyKey = 'SELECT id,name,cost FROM goods WHERE id IN (' + key.join(',') + ')';
        con.query(bodyKey, function (err, result, fields) {
            if (err) throw err;
            sendMail(req.body, result).catch(console.error);
            saveOrder(req.body, result);
            res.send('1');
        });
    } else {
        res.send('0');
    }
});

app.get('/admin', function (req, res) {
    res.render('admin', {});
});

app.post('/admin', function (req, res) {
    // res.render('admin', {});
    res.end('work');
    console.log(req.body);
});

app.get('/admin-order', function (req, res) {
    let currentDB = 'SELECT \n' +
        '\tshop_order.id as id,\n' +
        '\tshop_order.user_id as user_id,\n' +
        '    shop_order.goods_id as goods_id,\n' +
        '    shop_order.goods_cost as goods_cost,\n' +
        '    shop_order.goods_amount as goods_amount,\n' +
        '    shop_order.total as total,\n' +
        '    from_unixtime(date,"%Y-%m-%d %h:%m") as human_date,\n' +
        '    user_info.user_name as user,\n' +
        '    user_info.user_phone as phone,\n' +
        '    user_info.address as address\n' +
        'FROM \n' +
        '\tshop_order\n' +
        'LEFT JOIN\t\n' +
        '\tuser_info\n' +
        'ON shop_order.user_id = user_info.id ORDER BY id DESC';
    con.query(currentDB, function (err, result, fields) {
        if (err) throw err;
        console.log(result);
        res.render('admin-order', {order: JSON.parse(JSON.stringify(result))});
    });
})

app.get('/login', function (req, res) {
    res.render('login', {});
});

app.post('/login', function (req, res) {
    con.query(
        'SELECT * FROM user WHERE login="' + req.body.login + '" and password="' + req.body.password + '"',
        function (error, result) {
            if (error) reject(error);
            if (result.length == 0) {
                console.log('Error: User not found');
                res.redirect('/login');
            } else {
                result = JSON.parse(JSON.stringify(result));
                let hashFn = hashFunc(32);
                res.cookie('hash', hashFn);
                res.cookie('id', result[0]['id']);
                let sqlHash = "UPDATE user  SET hash='" + hashFn + "' WHERE id=" + result[0]['id'];
                con.query(sqlHash, function (error, resultQuery) {
                    if (error) throw error;
                    res.redirect('/admin');
                })
            }
        }
    )
});


function saveOrder(data, result) {
    let sql = "INSERT INTO user_info (user_name, user_phone, user_email,address) VALUES ('" + data.username +
        "', '" + data.phone + "', '" + data.email + "','" + data.address + "')";
    con.query(sql, function (error, result2) {
        if (error) throw error;
        console.log('1 user info saved');
        let userId = result2.insertId;
        date = new Date() / 1000;
        for (let i = 0; i < result.length; i++) {
            sql = "INSERT INTO shop_order (date, user_id, goods_id, goods_cost, goods_amount, total) VALUES (" + date + ", 45,"
                + result[i]['id'] + ", " + result[i]['cost'] + "," + data.key[result[i]['id']] +
                ", " + data.key[result[i]['id']] * result[i]['cost'] + ")";
            console.log(sql);
            con.query(sql, function (error, result2) {
                if (error) throw error;
                console.log("1 record inserted");
            });
        }

    });
}

async function sendMail(data, result) {
    let res = '<h2>Order in Lite Shop</h2>';
    let total = 0;
    for (let i = 0; i < result.length; i++) {
        res += `<p>${result[i]['name']} - ${data.key[result[i]['id']]}
        - ${result[i]['cost'] * data.key[result[i]['id']]} uah </p>`;
        total += result[i]['cost'] * data.key[result[i]['id']];
    }
    console.log(res);
    res += '<hr>';
    res += `Total ${total} uah`;
    res += `<hr>Phone: ${data.phone}`;
    res += `<hr>Username: ${data.username}`;
    res += `<hr>Address: ${data.address}`;
    res += `<hr>Email: ${data.email}`;

    let testAccount = await nodemailer.createTestAccount();

    let transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass,
        },
    });

    let mailOption = {
        from: '<liteshoptest@gmail.com>',
        to: 'liteshoptest@gmail.com,' + data.email,
        subject: 'Lite Shop order',
        text: 'Hello from Lite shop, thanks for order',
        html: res
    };

    let info = await transporter.sendMail(mailOption);
    console.log("MessageSent: %s", info.messageId);
    console.log("PreviewSent: %s", nodemailer.getTestMessageUrl(info));
    return true;
}









