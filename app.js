var express = require('express');
var app = express();

var Client = require('pg').Client;
var bd = new Client({
	user: 'postgres',
	host: 'localhost',
	database: 'postgres',
	password: 'postgres',
	port: 5432
});
bd.connect();

app.get('/get_event_products', function(req, response){

});
app.post('/add_payer', function(req, res){

});
app.post('/remove_payer', function(req, res){

});
app.post('/remove_all_payers', function(req, res){

});
app.post('/get_debitor_list', function(req, res){

});
app.post('/upload', function(req, res) {

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

app.listen(3000, function(){
	console.log('start');
});