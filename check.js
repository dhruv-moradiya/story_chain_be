const { exec } = require('child_process');

exec(
  'powershell "Get-WmiObject Win32_PhysicalMemory | Select-Object SMBIOSMemoryType,Speed,Capacity,Manufacturer,PartNumber"',
  (err, stdout) => {
    if (err) return console.error('Error:', err);

    console.log('\nRAW OUTPUT:\n', stdout);

    const mapping = {
      20: 'DDR',
      21: 'DDR2',
      24: 'DDR3',
      26: 'DDR4',
      34: 'DDR5',
    };

    const match = stdout.match(/SMBIOSMemoryType\s+:\s+(\d+)/g);

    if (match) {
      match.forEach((line, i) => {
        const value = parseInt(line.split(':')[1].trim());
        console.log(`RAM Stick ${i + 1}:`, mapping[value] || 'Unknown');
      });
    } else {
      console.log('Unable to detect DDR type');
    }
  }
);

const os = require('os');

console.log('Total RAM:', (os.totalmem() / 1024 ** 3).toFixed(2), 'GB');
console.log('Free RAM:', (os.freemem() / 1024 ** 3).toFixed(2), 'GB');
console.log('Platform:', os.platform());
console.log('Architecture:', os.arch());
