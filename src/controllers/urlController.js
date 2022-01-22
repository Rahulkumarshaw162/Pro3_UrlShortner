const urlModel = require('../models/urlModel')
const shortid = require('shortid')
//const validUrlData = require('valid-url')
const redis = require("redis");

const { promisify } = require("util");

//Connect to redis
const redisClient = redis.createClient(
  16648,
  "redis-16648.c264.ap-south-1-1.ec2.cloud.redislabs.com",
  { no_ready_check: true }
);
redisClient.auth("fp2VzV9GWjq1i0hHS6kylbu6gigDBnSI", function (err) {
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("Connected to Redis..");
});



//1. connect to the server
//2. use the commands :

//Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);



const isValidRequestBody = function (requestBody) {
  return Object.keys(requestBody).length > 0
};
const baseUrl = 'http://localhost:3000'

const createUrl = async function (req, res) {
  try {
    let requestBody = req.body;           //1
    // console.log(body)
    if (!isValidRequestBody(requestBody)) {
      res.status(400).send({ status: false, msg: "provide a valid body details" })
      return
    };
    const longUrl = req.body.longUrl;     //2
    let s = /(:?^((https|http|HTTP|HTTPS){1}:\/\/)(([w]{3})[\.]{1})?([a-zA-Z0-9]{1,}[\.])[\w]*((\/){1}([\w@?^=%&amp;~+#-_.]+))*)$/;
    if (!s.test(longUrl)) {
      return res.status(400).send({ status: false, message: `This is not a valid long Url` })
    }




    if ((longUrl)) {
      let cacheData = await GET_ASYNC(`${longUrl}`)

      if (cacheData) {
        // console.log(1)
        return res.status(200).send({ status: true, data: JSON.parse(cacheData) })
      }
      let urlExist = await urlModel.findOne({ longUrl: longUrl }).select({ longUrl: 1, shortUrl: 1, urlCode: 1, _id: 0 });

      if (urlExist) {
        await SET_ASYNC(`${longUrl}`, JSON.stringify(urlExist))
        return res.status(200).send({ status: true, data: urlExist })
      } else {
        const urlCode = shortid.generate().toLowerCase().replace(/[0-9]/g, '').replace(/[&\/\\#,+()$~%.-_-'":*?<>{}]/g, '');   //3

        const shortUrl = baseUrl + '/' + urlCode
        let urlOf = new urlModel({ longUrl, shortUrl, urlCode })
        await SET_ASYNC(`${longUrl}`, JSON.stringify(urlOf))
        let data = await urlModel.create(urlOf)
        return res.status(200).send({ status: true, data: data })
      }
    } else {
      return res.status(400).send({ status: false, msg: "not valid url" })
    }
  }
  catch (err) {
    console.log(err)
    return res.status(500).send({ status: false, msg: err.message });
  }
}
//******************************************************


// *************************************************************************
const getUrl = async function (req, res) {
  let cahcedProfileData = await GET_ASYNC(`${req.params.code}`)
  let data = JSON.parse(cahcedProfileData)

  //  console.log(cahcedProfileData);
  if (cahcedProfileData) {
    let longurl = data.longUrl;
    console.log(longurl)
    //res.send(data)
    return res.status(302).redirect(longurl)
  } else {
    let profile = await urlModel.findOne({ urlCode: req.params.code });
    console.log(profile)
    await SET_ASYNC(`${req.params.code}`, JSON.stringify(profile))
    return res.status(302).redirect(profile.longUrl)
  }

};
module.exports = { getUrl, createUrl }
