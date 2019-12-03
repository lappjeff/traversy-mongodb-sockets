const mongoose = require("mongoose");
const client = require("socket.io").listen(4200).sockets;

const connect = dbUrl => {
	mongoose.connect(dbUrl, {
		useNewUrlParser: true,
		useUnifiedTopology: true
	});
	const db = mongoose.connection;
	db.on("error", console.error.bind(console, "connection error"));
	db.once("open", () => {
		console.log(`Successfully connected to DB at URL \n ${dbUrl}`);
	});

	// Connect to Socket.io
	client.on("connection", () => {
		const chat = db.collection("chats");

		//Create function to send status
		const sendStatus = s => {
			client.emit("status", s);
		};

		// Get chats from mongo collection
		chat
			.find()
			.limit(100)
			.sort(
				{ _id: 1 }.toArray((err, res) => {
					if (err) throw err;

					client.emit("output", res);
				})
			);

		// Handle input events
		client.on("input", data => {
			const name = data.name;
			const message = data.message;

			// Check for name and message
			if (!name || !message) {
				// Send error status
				sendStatus("Please enter a name and a message");
			} else {
				// Insert message to DB
				chat.insert({ name, message }, () => {
					client.emit("output", [data]);

					// Send status object
					sendStatus({
						message: "Message sent",
						clear: true
					});
				});
			}
		});
	});
	// Handle clear
	client.on("clear", data => {
		// Remove all chats from collection
		chat.remove({}, () => {
			client.emit("cleared");
		});
	});
};

module.exports = connect;
