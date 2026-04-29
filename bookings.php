<?php
// ============================================================
//  BusGo – Bookings API
//  Endpoint: api/bookings.php
//
//  Actions:
//    GET  ?action=list                                – user's bookings
//    GET  ?action=booked_seats&route=&date=&time=     – occupied seat numbers
//    POST ?action=create   – { route, routeLabel, ticketType, date, time,
//                              seats[], count, total }
//    POST ?action=cancel   – { bookingId }
// ============================================================

require_once __DIR__ . '/../config.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$action = $_GET['action'] ?? (requestBody()['action'] ?? '');

switch ($action) {

    // ── LIST ─────────────────────────────────────────────────
    case 'list':
        $user = requireAuth();
        $db   = getDB();

        $stmt = $db->prepare(
            'SELECT * FROM bookings WHERE user_id = ? ORDER BY booked_at DESC'
        );
        $stmt->execute([$user['id']]);
        $rows = $stmt->fetchAll();

        // Normalise for the JS (parse JSON seats array)
        $bookings = array_map(fn($r) => formatBooking($r), $rows);

        jsonOk(['bookings' => $bookings]);
        break;

    // ── BOOKED SEATS ─────────────────────────────────────────
    case 'booked_seats':
        // Public endpoint – no auth required for seat display
        $route = $_GET['route'] ?? '';
        $date  = $_GET['date']  ?? '';
        $time  = $_GET['time']  ?? '';

        if (!$route || !$date || !$time) {
            jsonOk(['seats' => []]);
        }

        $db   = getDB();
        $stmt = $db->prepare(
            "SELECT seats FROM bookings
             WHERE route = ? AND travel_date = ? AND travel_time = ?
               AND status = 'confirmed'"
        );
        $stmt->execute([$route, $date, $time]);
        $rows = $stmt->fetchAll();

        $occupied = [];
        foreach ($rows as $row) {
            $arr = json_decode($row['seats'], true) ?? [];
            foreach ($arr as $s) {
                $occupied[] = (int)$s;
            }
        }
        $occupied = array_values(array_unique($occupied));

        jsonOk(['seats' => $occupied]);
        break;

    // ── CREATE ───────────────────────────────────────────────
    case 'create':
        $user = requireAuth();
        $body = requestBody();

        $route      = trim($body['route']       ?? '');
        $routeLabel = trim($body['routeLabel']   ?? '');
        $ticketType = trim($body['ticketType']   ?? '');
        $date       = trim($body['date']         ?? '');
        $time       = trim($body['time']         ?? '');
        // seats arrives as comma-string from form-encoded JS: "3,7,12"
        $rawSeats   = $body['seats'] ?? [];
        $seats      = is_array($rawSeats)
            ? $rawSeats
            : array_filter(explode(',', (string)$rawSeats), 'strlen');
        $count      = (int)($body['count']       ?? 0);
        $total      = (int)($body['total']       ?? 0);

        if (!$route || !$date || !$time || empty($seats) || $count < 1 || $total < 1) {
            jsonErr('Invalid booking data.');
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            jsonErr('Invalid date format.');
        }
        if (strtotime($date) < strtotime(date('Y-m-d'))) {
            jsonErr('Travel date cannot be in the past.');
        }

        // Make sure seats are still available
        $db   = getDB();
        $chk  = $db->prepare(
            "SELECT seats FROM bookings
             WHERE route = ? AND travel_date = ? AND travel_time = ?
               AND status = 'confirmed'"
        );
        $chk->execute([$route, $date, $time]);
        $taken = [];
        foreach ($chk->fetchAll() as $r) {
            $arr = json_decode($r['seats'], true) ?? [];
            foreach ($arr as $s) $taken[] = (int)$s;
        }
        $conflict = array_intersect(array_map('intval', $seats), $taken);
        if (!empty($conflict)) {
            jsonErr('Seat(s) ' . implode(', ', $conflict) . ' are no longer available. Please reselect.');
        }

        // Generate booking reference
        $bookingId = 'BG' . strtoupper(bin2hex(random_bytes(3)));   // e.g. BG4F9A2C

        $ins = $db->prepare(
            'INSERT INTO bookings
             (id, user_id, user_name, route, route_label, ticket_type,
              travel_date, travel_time, seats, seat_count, total, status)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,"confirmed")'
        );
        $ins->execute([
            $bookingId,
            $user['id'],
            $user['name'],
            $route,
            $routeLabel,
            $ticketType,
            $date,
            $time,
            json_encode(array_map('intval', $seats)),
            $count,
            $total,
        ]);

        // Return the full booking object
        $stmt = $db->prepare('SELECT * FROM bookings WHERE id = ?');
        $stmt->execute([$bookingId]);
        $booking = formatBooking($stmt->fetch());

        jsonOk(['booking' => $booking]);
        break;

    // ── CANCEL ───────────────────────────────────────────────
    case 'cancel':
        $user      = requireAuth();
        $body      = requestBody();
        $bookingId = trim($body['bookingId'] ?? '');

        if (!$bookingId) jsonErr('Missing bookingId.');

        $db   = getDB();
        $stmt = $db->prepare(
            "SELECT * FROM bookings WHERE id = ? AND user_id = ? AND status = 'confirmed'"
        );
        $stmt->execute([$bookingId, $user['id']]);
        $booking = $stmt->fetch();

        if (!$booking) jsonErr('Booking not found or already cancelled.');

        // Update status
        $upd = $db->prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?");
        $upd->execute([$bookingId]);

        // Calculate refund server-side (mirrors JS logic)
        $refund = calculateRefund($booking);

        jsonOk([
            'booking' => formatBooking(array_merge($booking, ['status' => 'cancelled'])),
            'refund'  => $refund,
        ]);
        break;

    default:
        jsonErr('Unknown action.', 404);
}

// ── Helpers ──────────────────────────────────────────────────

/** Normalise a DB row into the shape the JS expects */
function formatBooking(array $row): array {
    return [
        'id'          => $row['id'],
        'userId'      => $row['user_id'],
        'userName'    => $row['user_name'],
        'route'       => $row['route'],
        'routeLabel'  => $row['route_label'],
        'ticketType'  => $row['ticket_type'],
        'date'        => $row['travel_date'],
        'time'        => $row['travel_time'],
        'seats'       => json_decode($row['seats'], true) ?? [],
        'count'       => (int)$row['seat_count'],
        'total'       => (int)$row['total'],
        'status'      => $row['status'],
        'bookedAt'    => $row['booked_at'],
    ];
}

/** Mirror the JS refund logic server-side */
function calculateRefund(array $booking): array {
    $now      = new DateTime('now');
    $bookedAt = new DateTime($booking['booked_at']);
    $hoursSinceBooking = ($now->getTimestamp() - $bookedAt->getTimestamp()) / 3600;

    // Parse departure datetime
    $depDate  = $booking['travel_date'];                       // YYYY-MM-DD
    $depTime  = $booking['travel_time'];                       // e.g. "6:00 AM"
    $departure = DateTime::createFromFormat('Y-m-d g:i A', "$depDate $depTime")
                 ?: new DateTime("$depDate $depTime");
    $hoursUntilDeparture = ($departure->getTimestamp() - $now->getTimestamp()) / 3600;

    $total = (int)$booking['total'];

    if ($hoursSinceBooking <= 24) {
        $pct      = 100;
        $reason   = 'Cancelled within 24 hours of booking — full refund applies.';
        $timeline = 'Refund in 5–7 working days';
    } elseif ($hoursUntilDeparture < 0) {
        $pct      = 0;
        $reason   = 'Departure has already passed — no refund applicable.';
        $timeline = '';
    } elseif ($hoursUntilDeparture < 6) {
        $pct      = 0;
        $reason   = 'Cancellation within 6 hours of departure — no refund applicable.';
        $timeline = '';
    } elseif ($hoursUntilDeparture < 12) {
        $pct      = 50;
        $reason   = '50% refund applies (cancelled 6–12 hours before departure).';
        $timeline = 'Refund in 5–7 working days';
    } elseif ($hoursUntilDeparture < 24) {
        $pct      = 75;
        $reason   = '75% refund applies (cancelled 12–24 hours before departure).';
        $timeline = 'Refund in 5–7 working days';
    } else {
        $pct      = 100;
        $reason   = 'Cancelled more than 24 hours before departure — full refund applies.';
        $timeline = 'Refund in 5–7 working days';
    }

    $amount    = (int)round($total * $pct / 100);
    $breakdown = $pct === 100
        ? "Full refund ({$total} BDT × 100%)"
        : ($pct === 0 ? 'No refund (0 BDT)' : "{$pct}% of {$total} BDT");

    return [
        'amount'    => $amount,
        'breakdown' => $breakdown,
        'note'      => $reason,
        'timeline'  => $timeline,
    ];
}
