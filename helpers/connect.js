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
	client.on("connection", socket => {
		const chat = db.collection("chats");

		//Create function to send status
		const sendStatus = s => {
			socket.emit("status", s);
		};

		// Get chats from mongo collection
		chat
			.find()
			.limit(100)
			.sort(
				{ _id: 1 }.toArray((err, res) => {
					if (err) throw err;

					socket.emit("output", res);
				})
			);

		// Handle input events
		socket.on("input", data => {
			const name = data.name;
			const message = data.message;

			// Check for name and message
			if (!name || !message) {
				// Send error status
				sendStatus("Please enter a name and a message");
			} else {
				// Insert message to DB
				chat.insert({ name, message }, () => {
					socket.emit("output", [data]);

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
	socket.on("clear", data => {
		// Remove all chats from collection
		chat.remove({}, () => {
			socket.emit("cleared");
		});
	});
};

module.exports = connect;
