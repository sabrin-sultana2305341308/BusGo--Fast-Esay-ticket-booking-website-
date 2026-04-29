<?php
// ============================================================
//  BusGo – Database Configuration Template
//  Rename this file to config.php and fill in your credentials
// ============================================================

define('DB_HOST',    'localhost');           // e.g. sql210.infinityfree.com
define('DB_NAME',    'busgo_db');            // your database name
define('DB_USER',    'root');               // your database username
define('DB_PASS',    '');                   // your database password
define('DB_CHARSET', 'utf8mb4');

define('SESSION_NAME', 'busgo_sess');

if (session_status() === PHP_SESSION_NONE) {
    session_name(SESSION_NAME);
    session_set_cookie_params([
        'lifetime' => 86400 * 7,
        'path'     => '/',
        'secure'   => false,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', DB_HOST, DB_NAME, DB_CHARSET);
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

function jsonOk(array $data = []): void {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array_merge(['success' => true], $data));
    exit;
}

function jsonErr(string $message, int $httpCode = 400): void {
    http_response_code($httpCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}

function requestBody(): array {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (str_contains($contentType, 'application/json')) {
        $raw = file_get_contents('php://input');
        return $raw ? (json_decode($raw, true) ?? []) : [];
    }
    if (!empty($_POST)) return $_POST;
    $raw = file_get_contents('php://input');
    return $raw ? (json_decode($raw, true) ?? []) : [];
}

function requireAuth(): array {
    if (empty($_SESSION['user'])) {
        jsonErr('Unauthorized. Please login.', 401);
    }
    return $_SESSION['user'];
}