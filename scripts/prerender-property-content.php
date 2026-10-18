<?php
declare(strict_types=1);

// Adds meaningful property content to the initial HTML response. The browser
// still enhances this content with live CSV data, related cards and maps.
$root = dirname(__DIR__);
$handle = fopen($root . '/data/properties.csv', 'r');
if (!$handle) {
    fwrite(STDERR, "Could not open properties.csv\n");
    exit(1);
}
$headers = fgetcsv($handle);
$count = 0;
while (($values = fgetcsv($handle)) !== false) {
    $values = array_pad($values, count($headers), '');
    $item = array_combine($headers, array_slice($values, 0, count($headers)));
    if (strtolower($item['status']) !== 'active' || strtolower($item['approval_status']) !== 'approved') continue;
    $file = $root . '/property-' . preg_replace('/[^a-z0-9-]+/', '-', strtolower($item['id'])) . '.html';
    if (!is_file($file)) continue;
    $e = static fn(string $value): string => htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $place = $item['location'] ?: implode(', ', array_filter([$item['city'], $item['state']]));
    $place = $place ?: 'Jaipur, Rajasthan';
    $description = $item['description'] ?: ($item['meta_description'] ?: $item['title'] . ' property listing in ' . $place . '.');
    $price = is_numeric($item['price']) ? '₹' . number_format((float)$item['price'], 0, '.', ',') : 'Price on request';
    $type = $item['property_type'] ?: 'Property';
    $area = (float)$item['width_ft'] * (float)$item['height_ft'];
    $message = rawurlencode('Hello Call4All, I am interested in ' . $item['title'] . ' (' . $item['id'] . '). Link: https://call4all.co.in/' . basename($file));
    $body = '<main id="propertyDetail" data-catalog-id="' . $e($item['id']) . '"><article class="detail-card">'
      . '<img src="' . $e($item['image_path'] ?: 'assets/icons/icon-512.png') . '" alt="' . $e($item['image_alt'] ?: $item['title'] . ' in ' . $place) . '" width="900" height="675">'
      . '<div class="detail-content"><a href="properties.html">← Back to all properties</a><span class="property-type">' . $e($type) . '</span>'
      . '<h1>' . $e($item['title']) . '</h1><div class="detail-price">' . $e($price) . '</div><p class="property-location">📍 ' . $e($place) . '</p>'
      . '<div class="detail-grid"><div class="detail-stat"><small>Width</small><strong>' . $e($item['width_ft'] ?: 'Ask') . ' feet</strong></div>'
      . '<div class="detail-stat"><small>Length</small><strong>' . $e($item['height_ft'] ?: 'Ask') . ' feet</strong></div>'
      . '<div class="detail-stat"><small>Total area</small><strong>' . ($area > 0 ? $e(number_format($area, 0)) : 'Ask') . ' sq ft</strong></div>'
      . '<div class="detail-stat"><small>Listing type</small><strong>' . $e($type) . '</strong></div></div>'
      . '<h2>About this property</h2><p>' . nl2br($e($description), false) . '</p>'
      . '<h2>Price, location and visit</h2><p>This listing is available in ' . $e($place) . '. Confirm the current price, availability, exact location and visit time with Call4All before travelling.</p>'
      . '<div class="detail-actions"><a class="btn btn-whatsapp" href="https://wa.me/917737353588?text=' . $message . '">Enquire on WhatsApp</a></div>'
      . '</div></article></main>';
    $html = file_get_contents($file);
    $updated = preg_replace('~<main id="propertyDetail"\s+data-catalog-id="[^"]*">.*?</main>~s', $body, $html, 1);
    if ($updated !== null && $updated !== $html) {
        file_put_contents($file, $updated);
        $count++;
    }
}
fclose($handle);
echo "Prerendered {$count} property pages\n";
