const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));

// MongoDB setup
mongoose.connect(process.env.MONGO_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

// Define User schema and model
const userSchema = new mongoose.Schema({
	username: String,
});

const User = mongoose.model('User', userSchema);

// Define Exercise schema and model
const exerciseSchema = new mongoose.Schema({
	username: String,
	description: String,
	duration: Number,
	date: String,
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', (req, res) => {
	res.sendFile(process.cwd() + '/views/index.html');
});

// POST /api/users to create a new user
app.post('/api/users', async (req, res) => {
	const { username } = req.body;

	if (!username) {
		return res.json({ error: 'Username is required' });
	}

	try {
		const newUser = new User({ username });
		const savedUser = await newUser.save();
		res.json({ username: savedUser.username, _id: savedUser._id });
	} catch (err) {
		res.json({ error: 'Failed to create user' });
	}
});

// GET /api/users to get a list of all users
app.get('/api/users', async (req, res) => {
	try {
		const users = await User.find({});
		res.json(users);
	} catch (err) {
		res.json({ error: 'Failed to retrieve users' });
	}
});

// POST /api/users/:_id/exercises to add a new exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
	const { _id } = req.params;
	const { description, duration, date } = req.body;

	try {
		const user = await User.findById(_id);
		if (!user) {
			return res.json({ error: 'User not found' });
		}

		const exerciseDate = date
			? new Date(date).toDateString()
			: new Date().toDateString();

		const newExercise = new Exercise({
			username: user.username,
			description,
			duration,
			date: exerciseDate,
		});

		const savedExercise = await newExercise.save();

		res.json({
			username: user.username,
			description: savedExercise.description,
			duration: savedExercise.duration,
			date: savedExercise.date,
			_id: _id,
		});
	} catch (err) {
		res.json({ error: 'Failed to add exercise' });
	}
});

// GET /api/users/:_id/logs to retrieve exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
	const { _id } = req.params;
	const { from, to, limit } = req.query;

	try {
		const user = await User.findById(_id);
		if (!user) {
			return res.json({ error: 'User not found' });
		}

		let filter = { username: user.username };

		if (from || to) {
			filter.date = {};
			if (from) filter.date.$gte = new Date(from).toISOString().split('T')[0];
			if (to) filter.date.$lte = new Date(to).toISOString().split('T')[0];
		}

		const logsQuery = Exercise.find(filter);
		if (limit) {
			logsQuery.limit(parseInt(limit));
		}

		const logs = await logsQuery.exec();

		res.json({
			username: user.username,
			count: logs.length,
			_id: user._id,
			log: logs.map((exercise) => ({
				description: exercise.description,
				duration: exercise.duration,
				date: exercise.date,
			})),
		});
	} catch (err) {
		res.json({ error: 'Failed to retrieve logs' });
	}
});

app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});
