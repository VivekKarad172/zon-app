const { Design, Color } = require('./models');
const fs = require('fs');
const path = require('path');

async function check() {
    try {
        console.log('Checking Design zn-02...');
        const design = await Design.findOne({
            where: { designNumber: 'zn-02' },
            include: [Color]
        });

        if (!design) {
            console.error('ERROR: Design zn-02 NOT FOUND in database.');
        } else {
            console.log('Found Design:', design.toJSON());
            if (design.imageUrl) {
                const filePath = path.join(__dirname, '../', design.imageUrl);
                if (fs.existsSync(filePath)) {
                    console.log('Image File EXISTS at:', filePath);
                } else {
                    console.error('Image File MISSING at:', filePath);
                }
            } else {
                console.log('Design has NO imageUrl.');
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

check();
