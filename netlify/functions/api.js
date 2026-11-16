const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../public/students.json');
const STATS_FILE = path.join(__dirname, '../../public/stats.json');

let studentsCache = null;
let statsCache = null;

function loadData() {
    if (studentsCache) return;
    studentsCache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    statsCache = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
}

function filterStudents(students, params) {
    let filtered = students;

    const q = params.q;
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
                throw new Error('Invalid regex');
            }
        } else {
            const lowerQ = q.toLowerCase();
            filtered = filtered.filter(r =>
                Object.values(r).some(v => String(v).toLowerCase().includes(lowerQ))
            );
        }
    }

    const grade = params.grade;
    if (grade) {
        const grades = grade.split(',');
        filtered = filtered.filter(r => grades.includes(r.grade));
    }

    const gender = params.gender;
    if (gender) {
        const genders = gender.split(',');
        filtered = filtered.filter(r => genders.includes(r.gender));
    }

    const room = params.room;
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

    const nameRegex = params.name;
    if (nameRegex) {
        try {
            const re = new RegExp(nameRegex, 'i');
            filtered = filtered.filter(r => re.test(r.std_name + ' ' + r.std_sur));
        } catch (e) {}
    }

    const citizenRegex = params.citizen;
    if (citizenRegex) {
        try {
            const re = new RegExp(citizenRegex);
            filtered = filtered.filter(r => re.test(r.citizen_id));
        } catch (e) {}
    }

    return filtered;
}

exports.handler = async (event) => {
    loadData();

    const { httpMethod, queryStringParameters, path } = event;
    const params = queryStringParameters || {};

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    try {
        if (path.includes('/stats')) {
            return { statusCode: 200, headers, body: JSON.stringify(statsCache) };
        }

        if (path.includes('/student/')) {
            const citizenId = path.split('/student/')[1];
            const student = studentsCache.find(s => s.citizen_id === citizenId);
            if (!student) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
            return { statusCode: 200, headers, body: JSON.stringify(student) };
        }

        // /api/students
        let filtered = filterStudents(studentsCache, params);
        const total = filtered.length;

        const limit = parseInt(params.limit) || 0;
        const offset = parseInt(params.offset) || 0;
        if (limit > 0) {
            filtered = filtered.slice(offset, offset + limit);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ students: filtered, total, limit, offset })
        };
    } catch (err) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
};