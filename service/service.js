const connection = require("../utilities/puppeteerConnection");
const axiosConnection = require("../utilities/axiosConnection");
const util = require("../utilities/util");
const constant = require("../utilities/constant");
const model = require("../model/user");
const axios = require("axios");
const sendMailObj = require("../utilities/mail");

let service = {};

service.scrapAmazon = async (URL, domain) => {
  try {
    let retry = constant.START_RETRY_COUNT;
    do {
      let $ = await axiosConnection.initialiseAxios(URL);
      if ($(".product-title-word-break.a-size-large").html() != null) {
        let response = util.fetchAmazon($, URL, domain);
        return response;
      } else retry++;
    } while (retry <= process.env.RETRY_COUNT);
  } catch (error) {
    throw error;
  }
};

service.scrapAmazonPriceOnly = async (
  URL,
  domain,
  email,
  alertPrice,
  title,
  discountPrice,
  image,
  productId,
  emailSentPrice
) => {
  try {
    let retry = constant.START_RETRY_COUNT;
    do {
      let $ = await axiosConnection.initialiseAxios(URL);
      if ($("#productTitle").html() != null) {
        let price = await util.scrapAmazonPriceOnly($);
        if (price != null) {
          console.log(price, alertPrice, emailSentPrice);
          if (price <= alertPrice && price != emailSentPrice) {
            await sendMailObj.priceDropMail(
              price,
              email,
              URL,
              alertPrice,
              title,
              discountPrice,
              image
            );
            let obj = {};
            obj.email = email;
            obj.emailSentPrice = price;
            obj.productId = productId;
            await axios.put(
              `${process.env.AUTH_DOMAIN}/updateEmailSentPrice`,
              obj,
              {
                headers: {
                  "Content-type": "application/json; charset=UTF-8",
                },
              }
            );
          }
          let pId = util.getProductId(URL, domain);
          return await model.addTracker(price, URL, pId);
        } else retry++;
      } else retry++;
    } while (retry <= process.env.RETRY_COUNT);
  } catch (error) {
    throw error;
  }
};

service.scrapFlipkart = async (URL, domain) => {
  try {
    let retry = constant.START_RETRY_COUNT;
    do {
      let $ = await axiosConnection.initialiseAxios(URL);
      if ($(".B_NuCI").html() != null) {
        let response = util.fetchFlipkart($, URL, domain);
        return response;
      } else retry++;
    } while (retry <= process.env.RETRY_COUNT);
  } catch (error) {
    throw error;
  }
};

service.scrapFlipkartPriceOnly = async (
  URL,
  domain,
  email,
  alertPrice,
  title,
  discountPrice,
  image,
  productId,
  emailSentPrice
) => {
  try {
    let retry = constant.START_RETRY_COUNT;
    do {
      let $ = await axiosConnection.initialiseAxios(URL);
      if ($(".B_NuCI").html() != null) {
        let price = await util.scrapFlipkartPriceOnly($);
        if (price != null) {
          console.log(price, alertPrice, emailSentPrice);
          if (price <= alertPrice && price != emailSentPrice) {
            await sendMailObj.priceDropMail(
              price,
              email,
              URL,
              alertPrice,
              title,
              discountPrice,
              image
            );
            let obj = {};
            obj.email = email;
            obj.emailSentPrice = price;
            obj.productId = productId;
            await axios.put(
              `${process.env.AUTH_DOMAIN}/updateEmailSentPrice`,
              obj,
              {
                headers: {
                  "Content-type": "application/json; charset=UTF-8",
                },
              }
            );
          }
          let pId = util.getProductId(URL, domain);
          return await model.addTracker(price, URL, pId);
        } else retry++;
      } else retry++;
    } while (retry <= process.env.FLIPKART_RETRY_COUNT);
  } catch (error) {
    throw error;
  }
};

service.scrapMyntraPriceOnly = async (URL, domain, email, alertPrice) => {
  try {
    let retry = constant.START_RETRY_COUNT;
    do {
      let $ = await connection.initialisePuppeteer(URL);
      if ($(".pdp-name").html() != null) {
        let price = util.scrapMyntraPriceOnly($);
        if (price != null) {
          if (price <= alertPrice) {
            console.log("price reduced");
          }
          return await model.addTracker(price, URL);
        }
      } else retry++;
    } while (retry <= process.env.RETRY_COUNT);
  } catch (error) {
    throw error;
  }
};

service.scrapMyntra = async (URL, domain) => {
  try {
    let retry = constant.START_RETRY_COUNT;
    do {
      let $ = await connection.initialisePuppeteer(URL);
      if ($(".pdp-name").html() != null) {
        let response = util.fetchMyntra($, URL, domain);
        return response;
      } else retry++;
    } while (retry <= process.env.RETRY_COUNT);
  } catch (error) {
    throw error;
  }
};

service.getPriceHistory = async (URL) => {
  let domain = URL.replace(/.+\/\/|www.|\..+/g, "");
  if (domain != null || domain != undefined || domain != "") {
    domain = domain.toUpperCase();
  }
  let pId = util.getProductId(URL, domain);
  return model.getPriceHistory(pId);
};

module.exports = service;
