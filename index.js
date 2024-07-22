const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const shortid = require('shortid');

require('dotenv').config();

//* Middleware

app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// * MongoDB

mongoose
	.connect(process.env.MONGO_URI)
	.then(() => console.log('Connected to MongoDB'))
	.catch((err) => console.error('Failed to connect to MongoDB:', err));

// * Schemas

const exerciseSchema = new mongoose.Schema({
	userId: String,
	username: String,
	description: { type: String, required: true },
	duration: { type: Number, required: true },
	date: String,
});

const userSchema = new mongoose.Schema({
	username: String,
});

// * Models

let User = mongoose.model('User', userSchema);
let Exercise = mongoose.model('Exercise', exerciseSchema);

// * Endpoints

/*
 * GET
 * Delete all users
 */
app.get('/api/users/delete', function (_req, res) {
	console.log('### delete all users ###'.toLocaleUpperCase());

	User.deleteMany({})
		.then((result) =>
			res.json({ message: 'All users have been deleted!', result: result })
		)
		.catch((err) => {
			console.error(err);
			res.json({ message: 'Deleting all users failed!' });
		});
});

/*
 * GET
 * Delete all exercises
 */
app.get('/api/exercises/delete', function (_req, res) {
	console.log('### delete all exercises ###'.toLocaleUpperCase());

	Exercise.deleteMany({})
		.then((result) =>
			res.json({ message: 'All exercises have been deleted!', result: result })
		)
		.catch((err) => {
			console.error(err);
			res.json({ message: 'Deleting all exercises failed!' });
		});
});

app.get('/', async (_req, res) => {
	res.sendFile(__dirname + '/views/index.html');
	await User.syncIndexes();
	await Exercise.syncIndexes();
});

/*
 * GET
 * Get all users
 */
app.get('/api/users', function (_req, res) {
	console.log('### get all users ###'.toLocaleUpperCase());

	User.find({})
		.then((users) => {
			if (users.length === 0) {
				res.json({ message: 'There are no users in the database!' });
			} else {
				console.log('users in database: '.toLocaleUpperCase() + users.length);
				res.json(users);
			}
		})
		.catch((err) => {
			console.error(err);
			res.json({ message: 'Getting all users failed!' });
		});
});

/*
 * POST
 * Create a new user
 */
app.post('/api/users', async function (req, res) {
	const inputUsername = req.body.username;

	console.log('### create a new user ###'.toLocaleUpperCase());

	try {
		let newUser = new User({ username: inputUsername });

		console.log(
			'creating a new user with username - '.toLocaleUpperCase() + inputUsername
		);

		let user = await newUser.save();
		res.json({ username: user.username, _id: user._id });
	} catch (err) {
		console.error(err);
		res.json({ message: 'User creation failed!' });
	}
});

/*
 * POST
 * Add a new exercise
 * @param _id
 */
app.post('/api/users/:_id/exercises', async function (req, res) {
	const userId = req.params._id;
	const description = req.body.description;
	const duration = req.body.duration;
	let date = req.body.date;

	console.log('### add a new exercise ###'.toLocaleUpperCase());

	if (!date) {
		date = new Date().toISOString().substring(0, 10);
	}

	console.log(
		'looking for user with id ['.toLocaleUpperCase() + userId + '] ...'
	);

	try {
		let userInDb = await User.findById(userId);

		if (!userInDb) {
			return res.json({
				message: 'There are no users with that ID in the database!',
			});
		}

		let newExercise = new Exercise({
			userId: userInDb._id,
			username: userInDb.username,
			description: description,
			duration: parseInt(duration),
			date: date,
		});

		let exercise = await newExercise.save();
		res.json({
			username: userInDb.username,
			description: exercise.description,
			duration: exercise.duration,
			date: new Date(exercise.date).toDateString(),
			_id: userInDb._id,
		});
	} catch (err) {
		console.error(err);
		res.json({ message: 'Exercise creation failed!' });
	}
});

/*
 * GET
 * Get a user's exercise log
 * @param _id
 */
app.get('/api/users/:_id/logs', async function (req, res) {
	const userId = req.params._id;
	const from = req.query.from || new Date(0).toISOString().substring(0, 10);
	const to =
		req.query.to || new Date(Date.now()).toISOString().substring(0, 10);
	const limit = Number(req.query.limit) || 0;

	console.log('### get the log from a user ###'.toLocaleUpperCase());

	try {
		let user = await User.findById(userId);

		let exercises = await Exercise.find({
			userId: userId,
			date: { $gte: from, $lte: to },
		})
			.select('description duration date')
			.limit(limit)
			.exec();

		let parsedDatesLog = exercises.map((exercise) => ({
			description: exercise.description,
			duration: exercise.duration,
			date: new Date(exercise.date).toDateString(),
		}));

		res.json({
			_id: user._id,
			username: user.username,
			count: parsedDatesLog.length,
			log: parsedDatesLog,
		});
	} catch (err) {
		console.error(err);
		res.json({ message: 'Getting user log failed!' });
	}
});

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Your app is listening on port ' + listener.address().port);
});
