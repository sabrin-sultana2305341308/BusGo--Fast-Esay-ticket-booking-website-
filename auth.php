<?php
// ============================================================
//  BusGo – Auth API
//  Endpoint: api/auth.php
//
//  Actions (sent as JSON body or query-string):
//    GET  ?action=check    – returns current session user
//    POST ?action=login    – { identifier, password }
//    POST ?action=register – { name, phone, email, password }
//    POST ?action=logout   – (no body)
// ============================================================

require_once __DIR__ . '/../config.php';

// ── CORS (allow same-origin + local dev) ─────────────────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$action = $_GET['action'] ?? (requestBody()['action'] ?? '');

switch ($action) {

    // ── CHECK ────────────────────────────────────────────────
    case 'check':
        if (!empty($_SESSION['user'])) {
            jsonOk(['user' => $_SESSION['user']]);
        } else {
            jsonOk(['user' => null]);
        }
        break;

    // ── LOGIN ────────────────────────────────────────────────
    case 'login':
        $body       = requestBody();
        $identifier = trim($body['identifier'] ?? '');
        $password   = $body['password'] ?? '';

        if (!$identifier || !$password) {
            jsonErr('Please fill in all fields.');
        }

        $db   = getDB();
        $stmt = $db->prepare(
            'SELECT * FROM users WHERE email = :id OR phone = :id LIMIT 1'
        );
        $stmt->execute([':id' => $identifier]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            jsonErr('Invalid credentials. Please try again.');
        }

        $_SESSION['user'] = [
            'id'    => $user['id'],
            'name'  => $user['name'],
            'email' => $user['email'],
            'phone' => $user['phone'],
        ];

        jsonOk(['user' => $_SESSION['user']]);
        break;

    // ── REGISTER ─────────────────────────────────────────────
    case 'register':
        $body     = requestBody();
        $name     = trim($body['name']     ?? '');
        $phone    = trim($body['phone']    ?? '');
        $email    = strtolower(trim($body['email'] ?? ''));
        $password = $body['password'] ?? '';

        // ── Validation ──────────────────────────────────────
        if (!$name || !$phone || !$email || !$password) {
            jsonErr('Please fill in all fields.');
        }
        if (!preg_match('/^01[3-9]\d{8}$/', $phone)) {
            jsonErr('Enter a valid Bangladesh phone number (e.g. 01700000000).');
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonErr('Please enter a valid email address.');
        }
        if (strlen($password) < 6) {
            jsonErr('Password must be at least 6 characters.');
        }

        $db = getDB();

        // Duplicate checks
        $chk = $db->prepare('SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1');
        $chk->execute([$email, $phone]);
        $existing = $chk->fetch();
        if ($existing) {
            // Figure out which field conflicts
            $emailChk = $db->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
            $emailChk->execute([$email]);
            if ($emailChk->fetch()) {
                jsonErr('An account with this email already exists.');
            }
            jsonErr('An account with this phone number already exists.');
        }

        $userId   = 'u' . bin2hex(random_bytes(8));   // e.g. u4a3f...
        $passHash = password_hash($password, PASSWORD_BCRYPT);

        $ins = $db->prepare(
            'INSERT INTO users (id, name, phone, email, password) VALUES (?,?,?,?,?)'
        );
        $ins->execute([$userId, $name, $phone, $email, $passHash]);

        $_SESSION['user'] = [
            'id'    => $userId,
            'name'  => $name,
            'email' => $email,
            'phone' => $phone,
        ];

        jsonOk(['user' => $_SESSION['user']]);
        break;

    // ── LOGOUT ───────────────────────────────────────────────
    case 'logout':
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(
                session_name(), '', time() - 42000,
                $p['path'], $p['domain'],
                $p['secure'], $p['httponly']
            );
        }
        session_destroy();
        jsonOk(['message' => 'Logged out successfully.']);
        break;

    default:
        jsonErr('Unknown action.', 404);
}
