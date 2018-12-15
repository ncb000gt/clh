const { exec } = require('child_process');

const chalk = require('chalk');
const inquirer = require('inquirer');
const prependFile = require('prepend-file');

const parseArgs = args => {
	return args.reduce((acc, arg) => {
		const [key, value] = arg.split('=');

		return Object.assign({}, acc, {
			[key]: value
		});
	}, {});
};

const splitData = data => {
	const chunkedData = [];

	let commit = '';
	let date = '';
	let author = '';
	let message = '';
	data.split('\n').forEach(line => {
		if (line.startsWith('commit ') && commit && author && date) {
			// push up message
			chunkedData.push({
				commit,
				date,
				author,
				message
			});

			commit = line.replace('commit ', '');
			date = '';
			author = '';
			message = '';
		} else if (line.startsWith('commit ')) {
			commit = line.replace('commit ', '').replace(/^\s+/, '');
		} else if (line.startsWith('Author: ')) {
			author = line.replace('Author: ', '').replace(/^\s+/, '');
		} else if (line.startsWith('Date: ')) {
			date = line.replace('Date: ', '').replace(/^\s+/, '');
		} else {
			message += `${line.replace(/^\s+/g, '')}\n`;
		}
	});

	// last chunk
	chunkedData.push({
		commit,
		date,
		author,
		message
	});

	return chunkedData;
};

const divider = () => {
	console.log(chalk.blue('-----------------'));
	console.log('\n');
};

const interactiveChangelog = async entries => {
	const whatToDoQuestion = [
		{
			type: 'list',
			name: 'whatToDo',
			message: 'What would you like to do with this entry?',
			choices: [
				{
					name: 'Skip It',
					value: 'skip'
				},
				{
					name: 'Change It',
					value: 'change'
				},
				{
					name: 'Use It',
					value: 'use'
				}
			]
		}
	];

	return new Promise(async (resolve, reject) => {
		let newEntries = [];

		for (const entry of entries) {
			console.log(chalk.blue('Commit: '), entry.commit);
			console.log(chalk.blue('By: '), entry.author);
			console.log(chalk.blue('Message: '), entry.message);

			const { whatToDo } = await inquirer.prompt(whatToDoQuestion);

			switch (whatToDo) {
				case 'change': {
					const changeQuestion = [
						{
							type: 'editor',
							name: 'message',
							message: 'What would you like to use instead?',
							default:
								'\n' +
								entry.message
									.split('\n')
									.map(line => {
										return `# ${line}`;
									})
									.join('\n')
						}
					];

					const { message } = await inquirer.prompt(changeQuestion);
					newEntries.push(
						Object.assign({}, entry, {
							message: message
								.split('\n')
								.filter(line => !line.startsWith('# '))
								.join('\n')
						})
					);
					break;
				}

				case 'use': {
					newEntries.push(entry);
				}
			}

			// give some space
			console.log('\n');
			divider();
		}

		return resolve(newEntries);
	});
};

const constructChangelog = async (entries, version) => {
	const date = new Date();
	const formattedDate = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
	const log =
		`## [${version}] - ${formattedDate}\n` +
		entries
			.map(({ author, commit, message }) => {
				return `- ${message.replace(/\n+$/, '')} by ${author} in ${commit}`;
			})
			.join('\n') +
		'\n\n';

	console.log('Constructing Changelog');
	const whereToOutputQuestion = [
		{
			type: 'list',
			name: 'output',
			message: 'Where do you want to put the output?',
			choices: [
				{
					name: 'Disk',
					value: 'disk'
				},
				{
					name: 'Standard Out',
					value: 'stdout'
				}
			]
		}
	];

	const { output } = await inquirer.prompt(whereToOutputQuestion);
	switch (output) {
		case 'stdout':
			console.log(log);
			break;

		case 'disk':
			prependFile('./CHANGELOG', log, err => {
				if (err) {
					console.error(
						'There was a problem writing the changelog out. Here it is in case it did not write to disk.'
					);
					console.log(log);
				}
			});
			break;
	}
};

const run = async () => {
	const args = parseArgs(process.argv.slice(2));

	const { '--from': from, '--to': to } = args;

	exec(`git log ${from}..${to}`, async (err, data) => {
		if (err) {
			return console.error('problem getting log: ', err);
		}

		const chunkedData = splitData(data);

		console.log(
			chalk.blue('clh') +
				' found ' +
				chalk.blue(chunkedData.length) +
				' commits.'
		);
		divider();

		const entries = await interactiveChangelog(chunkedData);

		await constructChangelog(entries, to);
	});
};

run();
