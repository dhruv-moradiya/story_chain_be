const path = require('path');
const fs = require('fs');

const schemas = [
  'bookmark',
  'chapterVersion',
  'comment',
  'follow',
  'notification',
  'prComment',
  'prNotification',
  'prReview',
  'prVote',
  'pullRequest',
  'readingHistory',
  'report',
  'sesstion',
  'storyCollaborator',
  'vote',
];

const fileType = ['controller', 'service', 'router', 'validation', 'types'];

function createFiles() {
  const baseDir = path.join(__dirname, 'src/features');
  console.log('__dirname :>> ', __dirname);
  console.log('baseDir :>> ', baseDir);

  schemas.forEach((schemas) => {
    const schemaDir = path.join(baseDir, schemas);
    if (!fs.existsSync(schemaDir)) {
      fs.mkdirSync(schemaDir, { recursive: true });
      console.log(`Created directory: ${schemaDir}`);
    }

    fileType.forEach((type) => {
      const filePath = path.join(schemaDir, `${schemas}.${type}.ts`);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, `// ${schemas} ${type} file`);
        console.log(`Created file: ${filePath}`);
      }
    });
  });
}
createFiles();
