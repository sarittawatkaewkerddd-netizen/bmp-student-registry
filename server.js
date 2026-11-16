const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'students_full_db.tsv');
const CACHE_FILE = path.join(__dirname, 'students_cache.json');

let studentsCache = null;

function parseTSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split('\t');
    const dataLines = lines.slice(1);
    return dataLines.map(line => {
        const vals = line.split('\t');
        const row = {};
        headers.forEach((h, j) => row[h] = vals[j] || '');
        const cls = row.std_class || '';
        const m = cls.match(/^ม\.(\d)/);
        row.grade = m ? 'ม.' + m[1] : '';
        row.gradeNum = m ? parseInt(m[1]) : 0;
        row.gender = row.std_title === 'เด็กชาย' ? 'ชาย' : (row.std_title === 'เด็กหญิง' ? 'หญิง' : '');
        return row;
    });
}

function loadStudents() {
    if (studentsCache) return Promise.resolve(studentsCache);

    if (fs.existsSync(CACHE_FILE)) {
        try {
            const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            studentsCache = cached;
            console.log(`Loaded ${cached.length} students from cache`);
            return Promise.resolve(cached);
        } catch (e) {
            console.warn('Cache read failed, rebuilding...');
        }
    }

    return new Promise((resolve, reject) => {
        fs.readFile(DATA_FILE, 'utf8', (err, data) => {
            if (err) return reject(err);
            const students = parseTSV(data);
            students.sort((a, b) => {
                if (a.gradeNum !== b.gradeNum) return a.gradeNum - b.gradeNum;
                const roomA = (a.std_room || '').padStart(3, '0');
                const roomB = (b.std_room || '').padStart(3, '0');
                if (roomA !== roomB) return roomA.localeCompare(roomB);
                return parseInt(a.std_no || '0') - parseInt(b.std_no || '0');
            });
            fs.writeFileSync(CACHE_FILE, JSON.stringify(students));
            studentsCache = students;
            console.log(`Parsed and cached ${students.length} students`);
            resolve(students);
        });
    });
}

app.use(express.static(__dirname));
app.use(express.json());

app.get('/api/students', async (req, res) => {
    try {
        const students = await loadStudents();

        let filtered = students;

        const q = req.query.q;
        if (q) {
            const isRegex = q.startsWith('/') && q.lastIndexOf('/') > 0;
            if (isRegex) {
                const lastSlash = q.lastIndexOf('/');
                const pattern = q.slice(1, lastSlash);
                const flags = q.slice(lastSlash + 1);
                try {
                    const re = new RegExp(pattern, flags);
                    filtered = filtered.filter(r => Object.values(r).some(v => re.test(String(v))));
                } catch (e) {
                    return res.status(400).json({ error: 'Invalid regex' });
                }
            } else {
                const lowerQ = q.toLowerCase();
                filtered = filtered.filter(r =>
                    Object.values(r).some(v => String(v).toLowerCase().includes(lowerQ))
                );
            }
        }

        const grade = req.query.grade;
        if (grade) {
            const grades = grade.split(',');
            filtered = filtered.filter(r => grades.includes(r.grade));
        }

        const gender = req.query.gender;
        if (gender) {
            const genders = gender.split(',');
            filtered = filtered.filter(r => genders.includes(r.gender));
        }

        const room = req.query.room;
        if (room) {
            const rooms = [];
            room.split(',').forEach(part => {
                part = part.trim();
                if (part.includes('-')) {
                    const [start, end] = part.split('-').map(Number);
                    for (let i = start; i <= end; i++) rooms.push(String(i));
                } else {
                    rooms.push(part);
                }
            });
            filtered = filtered.filter(r => rooms.includes(r.std_room));
        }

        const nameRegex = req.query.name;
        if (nameRegex) {
            try {
                const re = new RegExp(nameRegex, 'i');
                filtered = filtered.filter(r => re.test(r.std_name + ' ' + r.std_sur));
            } catch (e) {}
        }

        const citizenRegex = req.query.citizen;
        if (citizenRegex) {
            try {
                const re = new RegExp(citizenRegex);
                filtered = filtered.filter(r => re.test(r.citizen_id));
            } catch (e) {}
        }

        const limit = parseInt(req.query.limit) || 0;
        const offset = parseInt(req.query.offset) || 0;
        const total = filtered.length;
        if (limit > 0) {
            filtered = filtered.slice(offset, offset + limit);
        }

        res.json({ students: filtered, total, limit, offset });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load students' });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const students = await loadStudents();
        const byGrade = {};
        const byGender = { ชาย: 0, หญิง: 0 };
        const byRoom = {};
        students.forEach(r => {
            byGrade[r.grade] = (byGrade[r.grade] || 0) + 1;
            byGender[r.gender] = (byGender[r.gender] || 0) + 1;
            byRoom[r.std_room] = (byRoom[r.std_room] || 0) + 1;
        });
        res.json({ total: students.length, byGrade, byGender, byRoom });
    } catch (err) {
        res.status(500).json({ error: 'Failed to compute stats' });
    }
});

app.get('/api/student/:citizenId', async (req, res) => {
    try {
        const students = await loadStudents();
        const student = students.find(s => s.citizen_id === req.params.citizenId);
        if (!student) return res.status(404).json({ error: 'Not found' });
        res.json(student);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load student' });
    }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    loadStudents();
});

module.exports = app;