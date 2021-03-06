var express = require('express')
var router = express.Router()
var fs = require('fs')
var settings = require("./settings.js")
var editor = require("./editor.js")
var db = require("./database.js")

/* GET home page. */
router.get('/*', function(req, res, next) {
    currentPage="/article/"+req.originalUrl.split("/")[2]

    var fileExist = function(url) {
        return new Promise(function(resolve, reject) {
            fs.exists(url, function(ok) {
                if (ok) {
                    resolve(url)
                } else {
                    reject("no file "+url)
                }
            })
        })
    }

    var readFile = function(url) {
            return new Promise(function(resolve, reject) {
                fs.readFile(url, function(err, data) {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(data)
                    }
                })
            })
        }
        //must use public beacause fs(node) and static(express) are different
    fileExist("public" + req.originalUrl).then(readFile).then(function(data) {
        //get article content
        var content = new Buffer(data).toString()
        // 以前需要转换markdown，现在源文件已经是html了
        // content = editor.convert(content)
        //get article file name
        settings.name=req.originalUrl.split("/")[3]
        settings.text = content
        settings.css = db[settings.name].css||''
        settings.title=db[settings.name].title
        settings.date=db[settings.name].date
        settings.currentPage=currentPage
        res.render('article', settings);
    }).catch(function(err) {
        console.log(err)
    })
});

module.exports = router;