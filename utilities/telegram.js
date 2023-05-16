const TelegramBot = require("node-telegram-bot-api");
const axiosConnection = require("./axiosConnection");
const model = require("../model/user");
const util = require("./util");
require("dotenv").config();

const token = process.env.TELEGRAM_PRICETRACKER_BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

let telegram = {};
let msgg = null,
  matchh = [];

bot.onText(/\/scrap (.+)/, async (msg, match) => {
  await scrap(msg, match);
});

const scrap = async (msg, match) => {
  if (msg && match) {
    const chatId = msg.chat.id;
    let scrapped = false;
    if (
      /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(
        match[1]
      )
    ) {
      let counter = 0,
        URL = match[1],
        $ = null,
        domain = "FLIPKART";
      if (URL && URL.includes("amzn")) {
        domain = "AMAZON";
      }
      do {
        message = `<strong>Creating connection...</strong>`;
        bot.sendMessage(chatId, message, {
          parse_mode: "HTML",
        });
        $ = await axiosConnection.initialiseAxios(URL);
        let response = null;
        if ($) {
          if (domain == "AMAZON") {
            if ($(".product-title-word-break.a-size-large").html() != null) {
              response = util.fetchAmazon($, URL, domain);
              scrapped = await sendResponse(response, domain, chatId);
              console.log(counter, scrapped);
            } else {
              counter++;
              let message = `<strong>Retrying ${counter}...</strong>`;
              bot.sendMessage(chatId, message, {
                parse_mode: "HTML",
              });
            }
          } else {
            if ($(".B_NuCI").html() != null) {
              response = util.fetchFlipkart($, URL, domain);
              scrapped = await sendResponse(response, domain, chatId);
              console.log(counter, scrapped);
            } else {
              counter++;
              let message = `<strong>Retrying ${counter}...</strong>`;
              bot.sendMessage(chatId, message, {
                parse_mode: "HTML",
              });
            }
          }
        } else {
          counter++;
          let message = `<strong>Retrying ${counter} time to create connection...</strong>`;
          bot.sendMessage(chatId, message, {
            parse_mode: "HTML",
          });
        }
      } while (counter <= 5 && !scrapped);
      if (counter > 5 && !scrapped) {
        // Create the inline keyboard
        msgg = msg;
        matchh = match;
        const inlineKeyboard = {
          inline_keyboard: [[{ text: "Retry", callback_data: "retry" }]],
        };
        // Send the message with the inline keyboard
        bot.sendMessage(chatId, "Failed to scrap!!!", {
          reply_markup: JSON.stringify(inlineKeyboard),
        });
      }
    } else {
      let message = `<strong>Invalid URL</strong>`;
      bot.sendMessage(chatId, message, {
        parse_mode: "HTML",
      });
    }
  }
};

bot.on("callback_query", async (query) => {
  const data = query.data;
  if (data === "retry") {
    console.log(msgg, matchh);
    bot.answerCallbackQuery(query.id, { text: "Retrying..." });
    await scrap(msgg, matchh);
  } else {
    bot.answerCallbackQuery(query.id, { text: "Try again" });
  }
});

const sendResponse = async (response, domain, chatId) => {
  if (
    response != null &&
    response != undefined &&
    response.price != null &&
    response.price != undefined &&
    response.price.discountPrice != null &&
    response.price.discountPrice != undefined
  ) {
    let pId = util.getProductId(response.url, domain);
    let totalProducts = await model.addTracker(
      response.price.discountPrice,
      response.url,
      pId
    );
    let message = `<strong>Total ${totalProducts} is now present in Database</strong>\r\n<strong>Price: ${response.price.discountPrice}</strong>\r\n<a href="${response.url}">View Product</a>`;
    bot.sendMessage(chatId, message, {
      parse_mode: "HTML",
    });
    return true;
  } else {
    let message = `<strong>Product is currently out of stock</strong>`;
    bot.sendMessage(chatId, message, {
      parse_mode: "HTML",
    });
  }
};

telegram.scrapped = async (title, price, URL, discountPrice) => {
  try {
    let droppedPrice = discountPrice - price;
    let message = `<strong>Price Dropped by ₹${droppedPrice}</strong>\r\n<pre>${title}</pre>\r\n\n<a href="${URL}">View Product</a>`;
    await bot.sendMessage(
      process.env.TELEGRAM_PRICETRACKER_CHANNEL_CHAT_ID,
      message,
      {
        parse_mode: "HTML",
      }
    );
  } catch (error) {
    console.log(error.message);
  }
};

telegram.newProductScrapped = async (price, URL) => {
  try {
    let message = `<strong>New Product Scrapped!!!</strong>\r\n<pre>Price: ₹${price}</pre>\r\n\n<a href="${URL}">View Product</a>`;
    await bot.sendMessage(
      process.env.TELEGRAM_PRICETRACKER_CHANNEL_CHAT_ID,
      message,
      {
        parse_mode: "HTML",
      }
    );
  } catch (error) {
    console.log(error.message);
  }
};

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  let message = `<strong>Running...</strong>`;
  if (msg.new_chat_members) {
    msg.new_chat_members.forEach((data) => {
      message = `Welcome to PriceTracker <strong>${data.first_name}</strong>\r\n\n<a href="https://www.trackprice.co.in/">View Website</a>`;
      bot.sendMessage(chatId, message, {
        parse_mode: "HTML",
      });
    });
  } else {
    let matches = msg.text.match(/\bhttps?:\/\/\S+/gi);
    if (
      matches &&
      matches.length > 0 &&
      /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(
        matches[0]
      )
    ) {
      matches.push(matches[0]);
      message = `<strong>Scraping started...</strong>`;
      bot.sendMessage(chatId, message, {
        parse_mode: "HTML",
      });
      scrap(msg, matches);
    } else {
      message = `<strong>Invalid Amazon or Flipkart URL</strong>`;
      bot.sendMessage(chatId, message, {
        parse_mode: "HTML",
      });
    }
  }
});

telegram.sendAutoScrapStarted = async (count) => {
  try {
    let message = `<strong>Scraping started on ${count} products at ${new Date().toLocaleString()}</strong>`;
    await bot.sendMessage(
      process.env.TELEGRAM_PRICETRACKER_CHANNEL_CHAT_ID,
      message,
      {
        parse_mode: "HTML",
      }
    );
  } catch (error) {
    console.log(error.message);
  }
};

telegram.sendAutoScrapCompleted = async () => {
  try {
    let message = `<strong>Scraping completed at ${new Date().toLocaleString()}</strong>`;
    await bot.sendMessage(
      process.env.TELEGRAM_PRICETRACKER_CHANNEL_CHAT_ID,
      message,
      {
        parse_mode: "HTML",
      }
    );
  } catch (error) {
    console.log(error.message);
  }
};

telegram.priceDropped = async (
  originalPrice,
  discountPrice,
  previousPrice,
  URL
) => {
  try {
    let droppedPrice = previousPrice - discountPrice;
    let message = `<strong>Price dropped by ₹${droppedPrice}</strong>\r\n<strong>Current Price: ₹${discountPrice}</strong>\r\n\n<pre>Previous Price: ₹${previousPrice}</pre>\r\n<pre>Original Price: ₹${originalPrice}</pre>\r\n<a href="${URL}">View Product</a>`;
    await bot.sendMessage(
      process.env.TELEGRAM_PRICETRACKER_CHANNEL_CHAT_ID,
      message,
      {
        parse_mode: "HTML",
      }
    );
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = telegram;
