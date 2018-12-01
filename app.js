var express = require('express');
const request = require('request');
const uuid = require('uuid/v4');
var bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.json());

/*
Принимает параметр qr - результат сканирования
*/
function getProductsModel(qr){
  var options = {
    uri: `http://localhost:3002/get?${qr}`,
    method: 'GET',
    json:true
  };
  return new Promise(function(resolve, reject){
      request(options, function(error, response, body){
        if(error){
          reject(error);
        }else{
          resolve(body);
        }

    });
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
};

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
});

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
    });
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
    });
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
	var body = req.body;
	bd.query('SELECT debitor FROM payments WHERE event_id = $1',[body.eventId]).then(function(result){
		var dates = result.rows;
		var rez = {};
		var members = body.members;
		members.forEach(function (id) {
			rez[id] = {
				ammount: 0,
				detail: {}
			}
		})
		for(var i=0;i<dates.length;i++){
			if (!products[dates[i].productId]) {
				products[dates[i].productId] = {
					payerId: dates[i].payerId,
					price: dates[i].price,
					persons: []
				}
			}
			if (dates[i].personId) {
				products[dates[i].productId].persons.push(dates[i].personId);
			}
		}
		Object.keys(products).forEach(function (productId) {
			var product = products[productId];
			if (product.persons.length==0){
				product.persons = members;
			}
			product.price = parseInt(product.price / product.persons.length) * product.persons.length;
			rez[product.payerId].ammount+=product.price
			for(var i=0;i<product.persons.length;i++){
				var pay =product.price/product.persons.length;
				rez[product.persons[i]].ammount-=pay;
				if (product.payerId != product.persons[i]) {
					if(!rez[product.payerId].detail[product.persons[i]]){
						rez[product.payerId].detail[product.persons[i]]={};
						rez[product.payerId].detail[product.persons[i]].ammount=pay;
					} else {
						rez[product.payerId].detail[product.persons[i]].ammount+=pay
					}
					if (!rez[product.persons[i]].detail[product.payerId]){
						rez[product.persons[i]].detail[product.payerId]={};
						rez[product.persons[i]].detail[product.payerId].ammount=-pay;

					} else{
						rez[product.persons[i]].detail[product.payerId].ammount-=pay;
					}
				}
			}
		})
		Object.keys(rez).forEach(function(memberId){
			var member = rez[memberId];
			if (member.ammount > 0) {
				Object.keys(member.detail).forEach(function(creditorId){
					var creditor = member.detail[creditorId];
					if (creditor.ammount < 0) {
						while(creditor.ammount != 0) {
							Object.keys(member.detail).forEach(function(debitorId){
								var debitor = member.detail[debitorId];
								if (debitor.ammount > 0) {
									var pay = Math.min(Math.abs(creditor.ammount), debitor.ammount);
									member.detail[debitorId].ammount -= pay;
									member.detail[creditorId].ammount += pay;
									rez[creditorId].detail[memberId].ammount -= pay;
									rez[creditorId].detail[debitorId].ammount += pay;
									rez[debitorId].detail[memberId].ammount += pay;
									rez[debitorId].detail[creditorId].ammount -= pay;
								}
							})
						}
					}
				})
			} else {
				Object.keys(member.detail).forEach(function(creditorId){
					var creditor = member.detail[creditorId];
					if (creditor.ammount > 0) {
						while(creditor.ammount != 0) {
							Object.keys(member.detail).forEach(function(debitorId){
								var debitor = member.detail[debitorId];
								if (debitor.ammount < 0) {
									var pay = Math.min(Math.abs(debitor.ammount), creditor.ammount);
									member.detail[debitorId].ammount += pay;
									member.detail[creditorId].ammount -= pay;
									rez[creditorId].detail[memberId].ammount += pay;
									rez[creditorId].detail[debitorId].ammount -= pay;
									rez[debitorId].detail[memberId].ammount -= pay;
									rez[debitorId].detail[creditorId].ammount += pay;
								}
							})
						}
					}
				})
			}
		})
		res.send(rez);
	});
});
app.post('/get_money_requests', function(req, res){
	bd.query('SELECT * FROM payments WHERE debitor = $1 and state IN (1)',[req.body.debitor]).then(function(result)
	{
		for(payment in result.rows){
			if(result.rows.hasOwnProperty(payment))
			{
				result.rows[payment].link = createYandexMoneyURL(result.rows[payment]);
			}
		}
		res.send(result.rows);
	})
});
function createYandexMoneyURL(row)
{
	 	
	return ("https://money.yandex.ru/transfer?receiver=" + row.req + "&sum=" + 
	row.sum + "&successURL=https%3A%2F%2Fmoney.yandex.ru%2Fquickpay%2Fbutton-widget%3Ftargets%3D%25D0%259E%25D0%25BF%25D0%25BB%25D0%25B0%25D1%2582%25D0%25B0%2520%25D1%2587%25D0%25B5%25D0%25BA%25D0%25B0%26default-sum%3D" + 
	row.sum + "%26button-text%3D11%26any-card-payment-type%3Don%26button-size%3Dm%26button-color%3Dorange%26successURL%3D%26quickpay%3Dsmall%26account%3D" + 
	row.req + "&quickpay-back-url=https%3A%2F%2Fmoney.yandex.ru%2Fquickpay%2Fbutton-widget%3Ftargets%3D%25D0%259E%25D0%25BF%25D0%25BB%25D0%25B0%25D1%2582%25D0%25B0%2520%25D1%2587%25D0%25B5%25D0%25BA%25D0%25B0%26default-sum%3D" + 
	row.sum + "%26button-text%3D11%26any-card-payment-type%3Don%26button-size%3Dm%26button-color%3Dorange%26successURL%3D%26quickpay%3Dsmall%26account%3D"+
	row.req + "%20чека&form-comment=Оплата%20чека&short-dest=&quickpay-form=small");
	
};
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
	for(var i = 0;i < req.body.debitor.length;i++)
	{
	bd.query('INSERT INTO payments VALUES ($1,$2,$3,$4,$5,$6)', [req.body.event_id,req.body.debitor[i].debitor,req.body.creditor,req.body.debitor[i].sum,req.body.req,req.body.state])
	}
});
app.post('/change_payment_state', function(req, res) {
	bd.query('UPDATE payments SET state = $4 WHERE event_id = $1 and debitor = $2 and creditor = $3',[req.body.event_id,req.body.debitor,req.body.creditor,req.body.state])
});
app.post('/get_payment', function(req, res) {

});
app.post('/delete_payment', function(req, res) {

});
app.post('/is_fixed', function(req, res) {
	bd.query('SELECT payments.event_id FROM payments WHERE event_id = $1',[req.body.event_id]).then(function(result)
	{
		if(result.rows.length !== 0)
			res.send(true);
	});
});
app.listen(3000, function() {
  console.log('start');
});
