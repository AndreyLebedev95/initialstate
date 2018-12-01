var fs=require('fs')
var QrCode = require('qrcode-reader');
var qr = new QrCode();

var Jimp = require("jimp");
var t=false;

var buffer = fs.readFileSync(__dirname + '/z3.jpg');
Jimp.read(buffer, function(err, image) {
    if (err) {
        console.error(err);
    }
    var qr = new QrCode();
    qr.callback = function(err, value) {
        if (err) {
            console.error(err);
        }
        console.log(value.result);
        console.log(value);
    };
    qr.decode(image.bitmap);
});
