//imports
var oauth = require('../modules/oauth.js');
var permisson = require('./permission.js');
var request = require('request');


/**
a list of webhooks to render on the home page. Used for jade compilation.
**/
var supportedWebhooks = [{
	name: "customers_create",
	description: "Customer creates an account",
	isActive: false
}, {
	name: "orders_fulfilled",
	description: "When an order is fulfilled",
	isActive: false
}, {
	name: "disputes_create",
	description: "When a dispute is created",
	isActive: false
}];


//home page
exports.home = function(req, res) {
	console.log("/HOME CALLED FULL CONFIRM URL:           " + req.originalUrl);

	permisson.verifyPermission(req, res, function(shopObject) {
		console.log("Rendering Home");
		renderHome(req, res, shopObject);
	});
};


function renderHome(req, res, shopObject) {
	// console.log(shopObject);
	request.get("https://" + shopObject.shop + "/admin/webhooks.json", {
		auth: {
			user: process.env.api_key,
			pass: process.env.shared_secret
		},
		headers: {
			'X-Shopify-Access-Token': shopObject.accessToken
		}
	}, function(error, response, body) {
		if (!error && response.statusCode == 200) {
			var webhooks = JSON.parse(body).webhooks;
			console.log(webhooks);
			var hasWebhook = [];

			//
			//PREPARE jade objects for html render
			//

			//populate hasWebhook with supported hooks:
			for (var i = 0; i < supportedWebhooks.length; i++) {
				supportedWebhooks[i].isActive = false;
				hasWebhook.push(supportedWebhooks[i]);
			}

			for (var i = 0; i < webhooks.length; i++) {
				var thisTopic = webhooks[i].topic;
				thisTopic = thisTopic.replace("\/", "_");

				for (var j = 0; j < supportedWebhooks.length; j++) {
					if (thisTopic == supportedWebhooks[j].name) {
						hasWebhook[j].isActive = true;
					}
				}
			}
			res.render('home', {
				defaultEmail: shopObject.defaultEmail,
				hasWebhook: hasWebhook
			});
		} else {
			if (response.statusCode == 401 && response.body.indexOf("access token") != -1) {
				//special case: The access token was not valid, so try to get first time permission again. This can happen if the app is removed and re-added again to the shop.
				// status=401, {"errors":"[API] Invalid API key or access token (unrecognized login or wrong password)"} 
				permisson.accessTokenWasInvalid(req, res, shopObject);
			} else {
				console.log("ERROR CODE: " + response.statusCode);
				console.log(response.body);
				res.status(response.statusCode).send("Failed Access Code");
			}

		}
	});

};