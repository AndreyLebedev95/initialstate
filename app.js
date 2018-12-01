var express = require('express');
const request = require('request');
const uuid = require('uuid/v4');
var bodyParser = require('body-parser')
var app = express();

app.use(bodyParser.json());

var products = getProductsModel("t=20181114T1515&s=4420.00&fn=8710000101582032&i=66506&fp=3824248540&n=1");

/*
Принимает параметр qr - результат сканирования
*/
function getProductsModel(qr){
  var options = {
    uri: `http://localhost:3002/get?${qr}`,
    method: 'GET',
    json:true
  }

  request(options, function(error, response, body){
      return body;
  });
}


var getChecksWithProducts = function(eventId) {
  return bd.query("SELECT * FROM checks LEFT JOIN product ON checks.id = product.checkid WHERE eventid = $1", [eventId]).then(function(res) {
    var temp = {};
    for (var i = 0; i < res.rows.length; i++) {
      if (!temp[res.rows[i].checkid]) {
        temp[res.rows[i].checkid] = {
          nameCheck: res.rows[i].seller,
          products: [{
            name: res.rows[i].name,
            price: res.rows[i].price,
            productId: res.rows[i].id
          }]
        }
      } else {
        temp[res.rows[i].checkid].products.push({
          name: res.rows[i].name,
          price: res.rows[i].price,
          productId: res.rows[i].id
        })
      }
    }
    return temp;
  })
}

var EVENT_ID = 'e36e597d-28fe-47d7-bc41-84d0a00faba0';
var PAYER_ID = '5e12ceab-59c2-4c54-94de-99bd2c543cad';
var PRODUCT_ID = 'ad5653c3-513b-48c2-9695-8b70ec33b8e0';

var Client = require('pg').Client;
var bd = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'postgres',
  port: 5432
});
bd.connect();

app.get('/', function(req, res) {
  res.send('hello')
})

app.get('/get_event_products/:eventId', function(req, response) {
  let eventId = req.params.eventId;
  var result = [];
  getChecksWithProducts(eventId).then(function(temp) {
    Object.keys(temp).forEach(function(checkId) {
      let check = temp[checkId];
      result.push({
        checkId: checkId,
        nameCheck: check.nameCheck,
        products: check.products
      })
    })
    response.send(JSON.stringify(result))
  })
});

app.get('/get_checks_total/:eventId', function(req, response) {
  let eventId = req.params.eventId;
  var result = [];
  getChecksWithProducts(eventId).then(function(temp) {
    Object.keys(temp).forEach(function(checkId) {
      let check = temp[checkId];
      console.log(check);
      result.push({
        checkId: checkId,
        nameCheck: check.nameCheck,
        total: check.products.reduce(function(res, product) {
          console.log(product);
          return res + product.price
        }, 0)
      })
    })
    response.send(JSON.stringify(result))
  })
});


app.post('/add_product_payer', function(req, res) {
	var body = req.body;
  bd.query("INSERT INTO debitor (personid, productid) VALUES ($1, $2);", [body.personId, body.productId]);
});

app.post('/remove_product_payer', function(req, res) {
	var body = req.body;
	bd.query("DELETE FROM debitor WHERE personid = $1 and productid = $2", [body.personId, body.productId]);
});
app.post('/remove_all_product_payers', function(req, res) {
	var body = req.body;
	bd.query("DELETE FROM debitor WHERE productid = $1", [body.productId]);
});
app.post('/get_debitor_list', function(req, res) {

});
app.post('/upload', function(req, res) {
  let checkId = uuid();
  let body = req.body;

  bd.query("INSERT INTO checks (id, eventid, seller, payerid) VALUES ($1, $2, $3, $4);", [checkId, body.eventId, products['seller'], body.payerId]);
  for (var index_product_id = 0; index_product_id < products.items.length; index_product_id++) {
    let productId = uuid();
    bd.query("INSERT INTO product (id, name, price, checkid) VALUES ($1, $2, $3, $4);", [productId, products['items'][index_product_id]['name'], products['items'][index_product_id]['price'], checkId]).then(function(res) {
      console.log(res)
    }).catch(function(res) {
      console.log(res)
    })
  }
});
app.post('/add_payment', function(req, res) {

});
app.post('/change_payment_state', function(req, res) {

});
app.post('/get_payment', function(req, res) {

});
app.post('/delete_payment', function(req, res) {

});
app.post('/is_fixed', function(req, res) {

});
app.listen(3000, function() {
  console.log('start');
});
