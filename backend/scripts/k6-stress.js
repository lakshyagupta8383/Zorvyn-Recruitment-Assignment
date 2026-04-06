import http from "k6/http";
import { check, fail, group, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

export const options = {
  vus: 50,
  stages: [
    { duration: "60s", target: 300 },
    { duration: "2m", target: 300 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
  },
};

const baseUrl = __ENV.BASE_URL || "http://localhost:3000";
const adminEmail = __ENV.ADMIN_EMAIL || "admin@zorvyn.com";
const adminPassword = __ENV.ADMIN_PASSWORD || "admin123";
const analystEmail = __ENV.ANALYST_EMAIL || adminEmail;
const analystPassword = __ENV.ANALYST_PASSWORD || adminPassword;
const categoryIdFromEnv = __ENV.CATEGORY_ID || "";

const createdRecords = new Counter("created_records");
const request429s = new Counter("request_429s");
const requestFailures = new Counter("request_failures");
const authLatency = new Trend("auth_latency");
const recordsLatency = new Trend("records_latency");
const analyticsLatency = new Trend("analytics_latency");

let adminToken;
let analystToken;
let categoryId;

function randomAmount() {
  return (Math.random() * 9990 + 10).toFixed(2);
}

function randomDate(daysBack = 60) {
  const offset = Math.floor(Math.random() * daysBack);
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return date.toISOString().slice(0, 10);
}

function dateWindow(daysBack = 90) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - daysBack);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function randomType() {
  return Math.random() < 0.5 ? "income" : "expense";
}

function randomNotes() {
  return `k6 stress test ${__VU}-${__ITER}-${Math.floor(Math.random() * 1e6)}`;
}

function assertOk(res, label, expectedStatus = 200) {
  const ok = check(res, {
    [`${label}: status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${label}: response time < 500ms`]: (r) => r.timings.duration < 500,
  });
  if (!ok) {
    requestFailures.add(1);
  }
  return ok;
}

function login(email, password) {
  const res = http.post(
    `${baseUrl}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } }
  );

  authLatency.add(res.timings.duration);
  if (res.status === 429) {
    request429s.add(1);
  }

  const token = res.json("data.token");
  if (!token) {
    requestFailures.add(1);
  }

  return token;
}

function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
}

export function setup() {
  const adminTokenValue = login(adminEmail, adminPassword);
  const analystTokenValue = login(analystEmail, analystPassword);

  if (categoryIdFromEnv) {
    return {
      categoryId: categoryIdFromEnv,
      adminToken: adminTokenValue,
      analystToken: analystTokenValue,
    };
  }

  const res = http.get(`${baseUrl}/categories?limit=100&page=1`, authHeaders(adminTokenValue));
  if (res.status === 429) {
    console.log("Setup hit rate limit while loading categories. Set CATEGORY_ID to a valid category UUID to avoid this lookup.");
    return {
      categoryId: "",
      adminToken: adminTokenValue,
      analystToken: analystTokenValue,
    };
  }

  if (!assertOk(res, "setup categories", 200)) {
    fail(`Could not load categories: ${res.status} ${res.body}`);
  }

  const categories = res.json("data") || [];
  const chosen = categories.find((category) => !category.is_system) || categories[0];

  if (!chosen || !chosen.id) {
    console.log("No category available in setup. Set CATEGORY_ID to a valid UUID before running the test.");
    return {
      categoryId: "",
      adminToken: adminTokenValue,
      analystToken: analystTokenValue,
    };
  }

  return {
    categoryId: chosen.id,
    adminToken: adminTokenValue,
    analystToken: analystTokenValue,
  };
}

export default function (data) {
  categoryId = data.categoryId;
  adminToken = data.adminToken;
  analystToken = data.analystToken;

  group("auth", () => {
    const meRes = http.get(`${baseUrl}/auth/me`, authHeaders(adminToken));
    authLatency.add(meRes.timings.duration);
    if (meRes.status === 429) {
      request429s.add(1);
    }
    assertOk(meRes, "auth me", 200);
  });

  group("records", () => {
    const window = dateWindow(90);
    const createPayload = {
      amount: randomAmount(),
      type: randomType(),
      category_id: categoryId,
      date: randomDate(90),
      notes: randomNotes(),
    };

    if (!categoryId) {
      requestFailures.add(1);
      return;
    }

    const createRes = http.post(
      `${baseUrl}/records`,
      JSON.stringify(createPayload),
      authHeaders(adminToken)
    );

    recordsLatency.add(createRes.timings.duration);
    if (createRes.status === 429) {
      request429s.add(1);
      return;
    }
    if (createRes.status !== 201) {
      requestFailures.add(1);
      return;
    }
    assertOk(createRes, "create record", 201);

    createdRecords.add(1);

    const recordId = createRes.json("data.id");
    const listRes = http.get(
      `${baseUrl}/records?page=1&limit=10&from=${window.from}&to=${window.to}`,
      authHeaders(adminToken)
    );

    recordsLatency.add(listRes.timings.duration);
    if (listRes.status === 429) {
      request429s.add(1);
      return;
    }
    if (listRes.status !== 200) {
      requestFailures.add(1);
      return;
    }
    assertOk(listRes, "list records", 200);

    if (recordId) {
      const detailRes = http.get(`${baseUrl}/records/${recordId}`, authHeaders(adminToken));
      recordsLatency.add(detailRes.timings.duration);
      if (detailRes.status === 429) {
        request429s.add(1);
      } else {
        assertOk(detailRes, "get record", 200);
      }
    }
  });

  group("analytics", () => {
    const window = dateWindow(90);
    const analyticsRes = http.get(
      `${baseUrl}/dashboard/analytics?from=${window.from}&to=${window.to}`,
      authHeaders(analystToken)
    );

    analyticsLatency.add(analyticsRes.timings.duration);
    if (analyticsRes.status === 429) {
      request429s.add(1);
      return;
    }
    assertOk(analyticsRes, "analytics", 200);
  });

  sleep(1);
}

export function handleSummary(data) {
  const metrics = data && data.metrics ? data.metrics : {};
  const duration = metrics.http_req_duration && metrics.http_req_duration.values ? metrics.http_req_duration.values : {};
  const failed = metrics.http_req_failed && metrics.http_req_failed.values ? metrics.http_req_failed.values : {};
  const reqs = metrics.http_reqs && metrics.http_reqs.values ? metrics.http_reqs.values : {};
  const checks = metrics.checks && metrics.checks.values ? metrics.checks.values : {};
  const created = metrics.created_records && metrics.created_records.values ? metrics.created_records.values : {};
  const errorRate = typeof failed.rate === "number" ? (failed.rate * 100).toFixed(2) : "n/a";
  const checksRate = typeof checks.rate === "number" ? (checks.rate * 100).toFixed(2) : "n/a";

  const summary = [
    "",
    "=== k6 stress test summary ===",
    `p(95) latency: ${duration["p(95)"] && duration["p(95)"].toFixed ? duration["p(95)"].toFixed(2) : "n/a"} ms`,
    `avg latency: ${duration.avg && duration.avg.toFixed ? duration.avg.toFixed(2) : "n/a"} ms`,
    `request rate: ${reqs.rate && reqs.rate.toFixed ? reqs.rate.toFixed(2) : "n/a"} req/s`,
    `error rate: ${errorRate}%`,
    `checks passed: ${checksRate}%`,
    `created records: ${created.count || 0}`,
    `429 responses: ${metrics.request_429s && metrics.request_429s.values ? metrics.request_429s.values.count || 0 : 0}`,
    `request failures: ${metrics.request_failures && metrics.request_failures.values ? metrics.request_failures.values.count || 0 : 0}`,
    "",
  ].join("\n");

  return { stdout: summary };
}
