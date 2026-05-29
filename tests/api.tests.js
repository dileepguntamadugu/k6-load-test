import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';


const SEARCH_API = 'https://www.tafensw.edu.au/api/course/_search';
const FIELDS = 'course.overview,course.nationalCode,course.title,course.qualification.*,course.scheduleRollup,course.deliveryRollup,course.careerPathwaysRollup,course.courseArea,course.courseArea.name,course.courseArea.id,course.cohortsRollup,course.sourceSystem,course.excludeFeeFree,course.availableFeeFreePlaces';
const LIMIT = 15;
const OFFSET = 1;

export const options = {
    /*stages: [
        {duration: '30s', target: 5}, // Ramp up to 5 users over 30 seconds - For service warmup
        {duration: '2m', target: 5},  // Stay at 5 users for 2 minutes - steady state
        {duration: '30s', target: 0}, // Ramp down to 0 users over 30 seconds - cool down
    ],*/
    stages: [
        {duration: '5s', target: 1}, // Ramp up to 5 users over 30 seconds - For service warmup
        {duration: '5s', target: 1},  // Stay at 5 users for 2 minutes - steady state
        {duration: '5s', target: 0}, // Ramp down to 0 users over 30 seconds - cool down
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
        http_req_failed: ['rate<0.01'], // Less than 1% of requests should fail
        checks: ['rate>0.99'], // 99% of checks should pass
    }
}

const courseData = new SharedArray('courses', function () {
    return JSON.parse(open('../data/courses.data.json')).data;
});

function getFormattedDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getFilters(currentDate) {
    return `offering.webPublishStartDate%3C=%22${currentDate}%22;` +
           `offering.webPublishEndDate%3E=%22${currentDate}%22`;
}

function pickRandomCourse() {
    const item = courseData[Math.floor(Math.random() * courseData.length)];
    return {
        query: item.searchTerm,
        courseId: item.code,
    };
}

export default function () {
    const { query, courseId } = pickRandomCourse();
    const currentDate = getFormattedDate();
    const filters = getFilters(currentDate);
    const url = `${SEARCH_API}?filters=${filters}` +
                `&query=${encodeURIComponent(query)}` +
                `&fields=${FIELDS}&limit=${LIMIT}` +
                `&offset=${OFFSET}`;

    console.log(`Search query: ${query}, courseId: ${courseId}`);
    const response = http.get(url);
    check(response, {
        'status is 200': (r) => r.status === 200,
        'response contains courseId': (r) => {
            const body = r.json();
            return Array.isArray(body.data)
            && body.data.length > 0 
            && body.data.some((item) => item.id === courseId);
        },
    });
    sleep(1);
}

export function handleSummary(data) {
    return {
        'stdout': textSummary(data, { indent: ' ', enableColors: true }), // Standard Console output
        'results/summary.json': JSON.stringify(data), // Raw JSON summary for further analysis
        'results/result.html': htmlReport(data), // HTML report for visual analysis
    };
}
