/* ===== Call4All — Local SEO enhancement blocks =====
 * Mount on any service page:
 *   <div class="seo-enhance-mount" data-seo-page="rental-cars"></div>
 * Injects: local contact + map, pricing table, benefits, nearby landmarks,
 * internal cross-links. Keeps heavy SEO copy DRY across 20+ pages.
 */
(function () {
  'use strict';

  const KUKAS = {
    locality: 'Kukas',
    city: 'Jaipur',
    region: 'Rajasthan',
    pin: '302028',
    street: 'Kukas, NH-48',
    phone: '+917737353588',
    phoneDisplay: '+91 7737353588',
    email: 'call4all.info@gmail.com',
    lat: 27.041750,
    lng: 75.895101,
    mapQuery: '27.041750,75.895101',
    landmarks: [
      'Arya College of Engineering & IT, Kukas',
      'The Leela Palace Jaipur (near Kukas)',
      'Kukas NH-48 resort belt',
      'Marble & granite factory zone, Kukas',
      'Amer Fort (nearby)',
      'Jaipur International Airport (~35–40 km)'
    ]
  };

  const INTERNAL = {
    carRental: { href: 'car-rental-kukas.html', label: 'Car Rental in Kukas, Jaipur' },
    carRentalJaipur: { href: 'car-rental-kukas.html', label: 'Car Rental Kukas Jaipur' },
    rooms: { href: 'rooms-flats-kukas.html', label: 'Rooms & Flats for Rent in Kukas' },
    roomRent: { href: 'room-rent-kukas-jaipur.html', label: 'Room Rent in Kukas Jaipur' },
    flatRent: { href: 'flat-rent-kukas-jaipur.html', label: 'Flat Rent in Kukas Jaipur' },
    wedding: { href: 'wedding-services-kukas.html', label: 'Wedding Services in Kukas Resorts' },
    tutor: { href: 'home-tutor-kukas.html', label: 'Home Tutor in Kukas' },
    construction: { href: 'construction-labor-kukas.html', label: 'Construction Labor in Kukas' },
    manpower: { href: 'manpower-supply-kukas.html', label: 'Manpower Supply in Kukas' },
    flowers: { href: 'flower-bouquet-kukas.html', label: 'Flower Bouquet in Kukas' },
    carDeco: { href: 'car-decoration-kukas.html', label: 'Wedding Car Decoration in Kukas' },
    hub: { href: 'kukas.html', label: 'All Services in Kukas, Jaipur' },
    home: { href: 'index.html', label: 'Call4All Homepage' }
  };

  /* Per-page SEO payloads — pricing, benefits, local copy, cross-links */
  const PAGES = {
    'rental-cars': {
      service: 'Car Rental',
      focus: 'Car rental and taxi service in Kukas and Jaipur',
      pricing: [
        ['Hatchback (Swift, WagonR)', '₹1,500 – ₹2,000 / day', 'Local Kukas & Jaipur city'],
        ['Sedan (Dzire, Etios)', '₹2,000 – ₹2,800 / day', 'Airport, outstation'],
        ['SUV (Innova, Ertiga)', '₹3,000 – ₹4,500 / day', 'Family & outstation'],
        ['Luxury wedding car', 'From ₹8,000 / day', 'BMW, Audi, Mercedes, Fortuner'],
        ['Kukas → Jaipur Airport (sedan)', '₹900 – ₹1,200 one-way', '~35–40 km'],
        ['Self-drive car', 'On request', 'Valid licence + deposit']
      ],
      benefits: [
        ['Verified drivers', 'Background-checked, licence-verified drivers who know Kukas–Jaipur routes.'],
        ['Same-day booking', 'Cars stationed near Kukas NH-48 — fast pickup even on short notice.'],
        ['Transparent pricing', 'Upfront quotes — no hidden night charges or surprise add-ons.'],
        ['24/7 support', 'Call or WhatsApp any time for airport, wedding or emergency trips.']
      ],
      localSections: [
        {
          title: 'Car Rental Near Arya College, Kukas',
          body: 'Students, faculty and visitors at <strong>Arya College of Engineering & IT, Kukas</strong> regularly book sedans and hatchbacks through Call4All for local errands, Jaipur city visits and airport transfers. Pickup from college gate or hostel — hourly and daily packages available.'
        },
        {
          title: 'Car Rental Near The Leela Palace & Kukas Resorts',
          body: 'The <strong>Leela Palace Jaipur</strong> and the luxury resort belt along NH-48 near Kukas are high-demand zones for wedding cars, guest transfers and VIP airport taxis. Call4All supplies decorated luxury cars (BMW, Audi, Mercedes, Fortuner) and standard sedans/SUVs for resort guests and wedding families.'
        },
        {
          title: 'Self Drive Cars in Kukas Jaipur',
          body: '<strong>Self-drive car rental in Kukas</strong> is available against a valid driving licence, ID proof and refundable security deposit. Hatchbacks and sedans for 12-hour or 24-hour slots — ideal for factory managers, resort staff and families who prefer to drive themselves.'
        }
      ],
      links: ['carRental', 'carRentalJaipur', 'rooms', 'carDeco', 'wedding', 'hub']
    },
    'rooms-flats': {
      service: 'Rooms & Flats for Rent',
      focus: 'Rooms, flats, PG and bachelor accommodation in Kukas and Jaipur',
      pricing: [
        ['Single room (Kukas)', '₹3,500 – ₹6,000 / month', 'Bachelor / worker'],
        ['1BHK flat (Kukas)', '₹6,000 – ₹12,000 / month', 'Unfurnished – semi-furnished'],
        ['2BHK flat (Kukas)', '₹9,000 – ₹18,000 / month', 'Family / staff'],
        ['PG with meals (Kukas)', '₹5,000 – ₹9,000 / month', 'AC / non-AC'],
        ['1BHK Jaipur city', '₹6,000 – ₹15,000 / month', 'Varies by area'],
        ['Brokerage', 'Disclosed upfront', 'No Call4All platform fee']
      ],
      benefits: [
        ['Verified owners', 'Direct contact with property owners — photos and rent details before visit.'],
        ['Kukas specialist', 'Rooms for marble-factory workers, resort staff and families on NH-48.'],
        ['Fast matching', '3–5 best options shared within 24 hours; same-day visits in Kukas.'],
        ['All types', '1RK, 1BHK, 2BHK, 3BHK, PG, bachelor rooms and commercial units.']
      ],
      localSections: [
        {
          title: 'Room Rent in Kukas for Factory & Resort Workers',
          body: 'Kukas has a large workforce in marble factories and luxury resorts. Call4All lists <strong>bachelor-friendly single rooms and shared accommodations</strong> near factory zones and the NH-48 resort belt — affordable, safe and available on short notice.'
        },
        {
          title: 'Flats for Rent Near Arya College, Kukas',
          body: 'Families and students looking for <strong>flats near Arya College, Kukas</strong> can choose from 1BHK and 2BHK options in nearby colonies. Furnished and semi-furnished flats with parking — ideal for staff accommodation and student groups.'
        },
        {
          title: 'PG and Furnished Rooms in Kukas Jaipur',
          body: '<strong>PG accommodation in Kukas</strong> with meals, Wi-Fi and AC/non-AC options is available for working professionals. Furnished rooms with attached bath are also listed for resort hospitality staff and IT/college commuters.'
        }
      ],
      links: ['rooms', 'roomRent', 'flatRent', 'carRental', 'manpower', 'hub']
    },
    'construction': {
      service: 'Construction Labor',
      focus: 'Mistri, mazdoor, thekedar and renovation teams in Kukas and Jaipur',
      pricing: [
        ['Mistri / mason', '₹600 – ₹900 / day', 'Per skilled worker'],
        ['Mazdoor / helper', '₹400 – ₹600 / day', 'Unskilled labour'],
        ['Thekedar / supervisor', 'On project quote', 'Full-site oversight'],
        ['Painting crew', '₹12 – ₹18 / sq.ft', 'Interior / exterior'],
        ['Plumbing / electrical', 'On visit quote', 'Per point or project'],
        ['Full labour contract', 'Custom quote', 'New build / renovation']
      ],
      benefits: [
        ['Skilled teams', 'Experienced mistri, painters, plumbers and electricians.'],
        ['Project-ready', 'Thekedar supervision for villas, factories and resort work in Kukas.'],
        ['Flexible hire', 'Daily wage, weekly teams or full-project contracts.'],
        ['Verified workers', 'Identity-checked labour — reliable attendance.']
      ],
      localSections: [
        {
          title: 'Construction Labor in Kukas Factory & Resort Projects',
          body: 'Kukas sees constant construction — new resorts, marble sheds, villas and staff quarters. Call4All supplies <strong>mistri, mazdoor and thekedar teams in Kukas</strong> for RCC work, plaster, flooring, painting and finishing.'
        },
        {
          title: 'Renovation & Repair in Kukas Jaipur',
          body: 'Property owners and resort managers book <strong>renovation labour in Kukas</strong> for room upgrades, kitchen remodels, waterproofing and exterior painting — with supervised teams and clear daily rates.'
        }
      ],
      links: ['construction', 'rooms', 'manpower', 'carRental', 'hub']
    },
    'home-tutor': {
      service: 'Home Tutor',
      focus: 'Home tuition in Kukas and Jaipur — CBSE, RBSE, NEET, JEE',
      pricing: [
        ['Class 1–5 (all subjects)', '₹3,000 – ₹5,000 / month', '5 days/week'],
        ['Class 6–8', '₹4,000 – ₹7,000 / month', 'Per subject or combo'],
        ['Class 9–10 (board)', '₹5,000 – ₹9,000 / month', 'CBSE / RBSE'],
        ['Class 11–12 Science', '₹8,000 – ₹15,000 / month', 'PCM / PCB'],
        ['NEET / JEE foundation', '₹10,000 – ₹20,000 / month', 'Experienced faculty'],
        ['English / spoken English', '₹3,500 – ₹6,000 / month', 'Kids & adults']
      ],
      benefits: [
        ['Qualified tutors', 'Subject experts for CBSE, RBSE and competitive exams.'],
        ['Home visits', 'Tutor comes to your home in Kukas or Jaipur — safe and convenient.'],
        ['Trial class', 'Demo session before you commit to monthly fees.'],
        ['All boards', 'CBSE, RBSE, ICSE — Maths, Science, English, Hindi and more.']
      ],
      localSections: [
        {
          title: 'Home Tutor Near Arya College, Kukas',
          body: 'Students in <strong>Kukas and Arya College area</strong> book home tutors for engineering prep, Class 11–12 Science and spoken English. Tutors familiar with local school syllabi and exam patterns.'
        },
        {
          title: 'Tuition for School Children in Kukas Colonies',
          body: 'Parents in Kukas residential colonies hire <strong>home tutors for Class 1–10</strong> — homework help, concept building and board exam preparation with regular progress updates.'
        }
      ],
      links: ['tutor', 'rooms', 'carRental', 'hub']
    },
    'manpower-supply': {
      service: 'Manpower Supply',
      focus: 'Skilled and unskilled manpower for factories, resorts and events in Kukas',
      pricing: [
        ['Unskilled helper', '₹400 – ₹600 / day', 'Factory / warehouse'],
        ['Skilled technician', '₹700 – ₹1,200 / day', 'As per trade'],
        ['Housekeeping staff', '₹500 – ₹800 / day', 'Hotel / resort'],
        ['Event staff / waiter', '₹500 – ₹900 / day', 'Weddings & corporate'],
        ['Security guard', '₹600 – ₹900 / day', '12-hour shift'],
        ['Monthly manpower contract', 'Custom quote', 'Bulk hiring']
      ],
      benefits: [
        ['Industry experience', 'Staff for marble factories, resorts, hotels and warehouses in Kukas.'],
        ['Rapid deployment', 'Teams mobilised within 24–48 hours for urgent requirements.'],
        ['Skilled & unskilled', 'From general helpers to trained machine operators.'],
        ['Event-ready', 'Waiters, ushers, housekeeping for Kukas resort weddings.']
      ],
      localSections: [
        {
          title: 'Manpower for Kukas Marble Factories',
          body: 'Marble and granite units in Kukas need <strong>skilled cutters, polishers and unskilled helpers</strong> on daily or monthly contracts. Call4All maintains a pool of verified workers for factory owners.'
        },
        {
          title: 'Resort & Hotel Staff in Kukas',
          body: 'Luxury resorts on NH-48 hire <strong>housekeeping, kitchen helpers, stewards and event staff</strong> through Call4All — for peak wedding season and year-round operations.'
        }
      ],
      links: ['manpower', 'construction', 'rooms', 'wedding', 'hub']
    },
    'marriage-services': {
      service: 'Marriage & Wedding Services',
      focus: 'Destination weddings and resort weddings in Kukas, Jaipur',
      pricing: [
        ['Mandap & stage decor', '₹25,000 – ₹2,00,000+', 'Theme-based'],
        ['Catering (per plate)', '₹400 – ₹1,500 / plate', 'Multi-cuisine'],
        ['Photography package', '₹30,000 – ₹1,50,000', 'Photo + video'],
        ['Wedding car + decoration', '₹5,000 – ₹25,000', 'Per car'],
        ['Full wedding planning', 'Custom budget', 'A-to-Z Kukas resort wedding'],
        ['Mehendi / DJ / entertainment', 'On quote', 'Add-on services']
      ],
      benefits: [
        ['Kukas resort expertise', 'We know every major wedding venue on NH-48.'],
        ['Single point contact', 'Decoration, catering, cars, flowers — one Call4All coordinator.'],
        ['Budget flexibility', 'Intimate gatherings to 500+ guest destination weddings.'],
        ['Trusted vendors', 'Verified caterers, photographers and decorators.']
      ],
      localSections: [
        {
          title: 'Destination Wedding in Kukas Resorts',
          body: '<strong>Kukas is Jaipur\'s premier destination-wedding belt</strong> — luxury resorts, farmhouses and palatial venues along NH-48. Call4All plans complete weddings: venue liaison, mandap, catering, photography, dulha-dulhan entry and baraat coordination.'
        },
        {
          title: 'Wedding Near The Leela Palace & NH-48 Venues',
          body: 'Families hosting weddings near <strong>The Leela Palace Jaipur and Kukas resort properties</strong> use Call4All for guest logistics (rooms, cars), floral decor, catering and on-ground event staff.'
        }
      ],
      links: ['wedding', 'carDeco', 'flowers', 'carRental', 'rooms', 'hub']
    },
    'flower-bouquet': {
      service: 'Flower Bouquet & Decoration',
      focus: 'Fresh flowers, bouquets and hotel room decoration in Kukas and Jaipur',
      pricing: [
        ['Rose bouquet (standard)', '₹500 – ₹1,500', 'Same-day Kukas delivery'],
        ['Premium mixed bouquet', '₹1,500 – ₹4,000', 'Occasions & gifting'],
        ['Hotel room decoration', '₹2,000 – ₹8,000', 'Anniversary / proposal'],
        ['Event centerpiece (per table)', '₹300 – ₹1,200', 'Corporate & wedding'],
        ['Stage / mandap florals', 'On quote', 'Wedding scale'],
        ['Daily hotel lobby arrangement', 'Monthly contract', 'Resorts in Kukas']
      ],
      benefits: [
        ['Same-day delivery', 'Fresh flowers delivered in Kukas and Jaipur on short notice.'],
        ['Resort experience', 'Regular supply for Kukas hotels and wedding venues.'],
        ['Custom designs', 'Colour-themed bouquets for weddings and corporate events.'],
        ['Fresh guarantee', 'Seasonal blooms — roses, lilies, orchids and marigold.']
      ],
      localSections: [
        {
          title: 'Flower Delivery for Kukas Resorts & Hotels',
          body: 'Resort guests and wedding planners order <strong>flower bouquets and room decorations in Kukas</strong> — welcome garlands, bedside roses, proposal setups and lobby arrangements.'
        },
        {
          title: 'Wedding Florals in Kukas Jaipur',
          body: 'From <strong>bridal bouquets to mandap florals</strong>, Call4All coordinates with local florists for Kukas destination weddings — marigold, rose and theme-matched installations.'
        }
      ],
      links: ['flowers', 'wedding', 'carDeco', 'hub']
    },
    'car-decoration': {
      service: 'Wedding Car Decoration',
      focus: 'Dulha, dulhan and baraat car decoration in Kukas resorts',
      pricing: [
        ['Basic fresh-flower decor', '₹1,500 – ₹3,000', 'Sedan / hatchback'],
        ['Premium wedding decor', '₹3,000 – ₹8,000', 'SUV / luxury car'],
        ['Theme-based decoration', '₹5,000 – ₹15,000', 'Colour-matched to wedding'],
        ['Baraat car styling', '₹2,500 – ₹6,000', 'Fortuner / Innova'],
        ['Luxury car (BMW/Audi)', '₹8,000 – ₹20,000', 'Full floral wrap'],
        ['On-site decorator', 'Included', 'At Kukas resort or home']
      ],
      benefits: [
        ['Resort-ready', 'Decorators reach any Kukas NH-48 wedding venue on time.'],
        ['Fresh flowers', 'Rose, marigold and orchid themes — not cheap plastic.'],
        ['Car + decor combo', 'Book decorated wedding car and rental together.'],
        ['Last-minute OK', 'Same-day decoration for most car categories.']
      ],
      localSections: [
        {
          title: 'Wedding Car Decoration at Kukas Resorts',
          body: 'Destination weddings at <strong>Kukas resorts</strong> need coordinated dulha, dulhan and baraat car decoration. Call4All sends on-site florists with fresh flowers matched to your wedding palette.'
        },
        {
          title: 'Dulha Dulhan Car Decor Near Leela Palace Jaipur',
          body: 'Luxury weddings near <strong>The Leela Palace and Kukas venue cluster</strong> get premium car decoration — BMW, Audi, Mercedes and Fortuner with elegant floral and ribbon styling.'
        }
      ],
      links: ['carDeco', 'carRental', 'wedding', 'flowers', 'hub']
    },
    /* Kukas-dedicated page keys (same rich blocks, Kukas-only framing) */
    'car-rental-kukas': { extend: 'rental-cars', kukasOnly: true },
    'car-rental-kukas-jaipur': { extend: 'rental-cars', kukasOnly: true, keyword: 'Car Rental Kukas Jaipur' },
    'rooms-flats-kukas': { extend: 'rooms-flats', kukasOnly: true },
    'room-rent-kukas-jaipur': { extend: 'rooms-flats', kukasOnly: true, keyword: 'Room Rent Kukas Jaipur' },
    'flat-rent-kukas-jaipur': { extend: 'rooms-flats', kukasOnly: true, keyword: 'Flat Rent Kukas Jaipur' },
    'wedding-services-kukas': { extend: 'marriage-services', kukasOnly: true },
    'home-tutor-kukas': { extend: 'home-tutor', kukasOnly: true },
    'construction-labor-kukas': { extend: 'construction', kukasOnly: true },
    'manpower-supply-kukas': { extend: 'manpower-supply', kukasOnly: true },
    'flower-bouquet-kukas': { extend: 'flower-bouquet', kukasOnly: true },
    'car-decoration-kukas': { extend: 'car-decoration', kukasOnly: true }
  };

  function resolvePage(key) {
    let cfg = PAGES[key];
    if (!cfg) return null;
    if (cfg.extend) {
      const base = Object.assign({}, PAGES[cfg.extend]);
      cfg = Object.assign(base, cfg);
      delete cfg.extend;
    }
    return cfg;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderPricingTable(rows) {
    if (!rows || !rows.length) return '';
    const trs = rows.map(r =>
      `<tr><td>${esc(r[0])}</td><td><strong>${esc(r[1])}</strong></td><td>${esc(r[2])}</td></tr>`
    ).join('');
    return `
      <section class="seo-block seo-pricing" aria-labelledby="seo-pricing-title">
        <span class="section-eyebrow">Pricing Guide</span>
        <h2 class="section-title" id="seo-pricing-title">Indicative <span class="accent">Pricing</span> (Kukas &amp; Jaipur)</h2>
        <div class="title-divider"></div>
        <p class="section-subtitle">Rates are indicative and depend on season, vehicle/property type and duration. Call for an exact quote.</p>
        <div class="seo-table-wrap">
          <table class="seo-table">
            <thead><tr><th>Service / Item</th><th>Price Range</th><th>Notes</th></tr></thead>
            <tbody>${trs}</tbody>
          </table>
        </div>
        <p class="seo-note">📞 Exact quote: <a href="tel:+917737353588">${KUKAS.phoneDisplay}</a> &nbsp;|&nbsp; <a href="https://wa.me/917737353588" target="_blank" rel="noopener">WhatsApp</a></p>
      </section>`;
  }

  function renderBenefits(items) {
    if (!items || !items.length) return '';
    const cards = items.map(b =>
      `<div class="seo-benefit-card"><h3>${esc(b[0])}</h3><p>${b[1]}</p></div>`
    ).join('');
    return `
      <section class="seo-block seo-benefits" aria-labelledby="seo-benefits-title">
        <span class="section-eyebrow">Why Call4All</span>
        <h2 class="section-title" id="seo-benefits-title">Benefits of Booking <span class="accent">Through Call4All</span></h2>
        <div class="title-divider"></div>
        <div class="seo-benefits-grid">${cards}</div>
      </section>`;
  }

  function renderLocalSections(sections, kukasOnly) {
    if (!sections || !sections.length) return '';
    const blocks = sections.map(s =>
      `<div class="seo-local-section"><h2>${s.title}</h2><p>${s.body}</p></div>`
    ).join('');
    const intro = kukasOnly
      ? `<p class="lead">This page is optimised for customers searching for services in <strong>Kukas, Jaipur (PIN ${KUKAS.pin})</strong> — NH-48 highway belt, Arya College area, resort zone and marble factory colonies.</p>`
      : `<p class="lead">Call4All serves <strong>Kukas, Jaipur (PIN ${KUKAS.pin})</strong> and greater Jaipur with verified providers. Local landmarks we cover include Arya College, The Leela Palace area, Kukas resort belt and marble factory zone.</p>`;
    return `
      <section class="seo-block seo-local-content">
        ${intro}
        ${blocks}
        <h2>Local Areas We Serve Near Kukas</h2>
        <ul class="seo-areas-list">
          ${KUKAS.landmarks.map(l => `<li>${esc(l)}</li>`).join('')}
          <li>Achrol, Chomu, Amer, Jamwa Ramgarh</li>
          <li>Jaipur city centre, airport &amp; railway station</li>
        </ul>
      </section>`;
  }

  function renderLocalContactBlock(service) {
    const mapSrc = `https://maps.google.com/maps?q=${KUKAS.mapQuery}&z=13&output=embed`;
    return `
      <section class="seo-block seo-local-contact" id="local-contact" aria-labelledby="local-contact-title">
        <span class="section-eyebrow">📍 Local SEO</span>
        <h2 class="section-title" id="local-contact-title">Find Call4All in <span class="accent">Kukas, Jaipur</span></h2>
        <div class="title-divider"></div>
        <p class="section-subtitle">${esc(service)} in Kukas, Jaipur — PIN ${KUKAS.pin}, Rajasthan. Call or visit us on the map below.</p>
        <div class="seo-local-grid">
          <div class="seo-local-info">
            <ul class="seo-contact-list">
              <li><strong>Business:</strong> Call4All</li>
              <li><strong>Service area:</strong> Kukas, Jaipur &amp; nearby</li>
              <li><strong>Address:</strong> ${esc(KUKAS.street)}, ${esc(KUKAS.locality)}, ${esc(KUKAS.city)}, ${esc(KUKAS.region)} ${KUKAS.pin}, India</li>
              <li><strong>PIN Code:</strong> ${KUKAS.pin}</li>
              <li><strong>Phone:</strong> <a href="tel:${KUKAS.phone}">${KUKAS.phoneDisplay}</a></li>
              <li><strong>Email:</strong> <a href="mailto:${KUKAS.email}">${KUKAS.email}</a></li>
              <li><strong>Hours:</strong> 24/7 — every day</li>
            </ul>
            <div class="seo-local-cta">
              <a href="tel:${KUKAS.phone}" class="btn btn-accent">📞 Call ${KUKAS.phoneDisplay}</a>
              <a href="https://wa.me/917737353588" class="btn btn-outline" target="_blank" rel="noopener">WhatsApp</a>
              <a href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(KUKAS.mapQuery)}" class="btn btn-outline" target="_blank" rel="noopener">Open in Google Maps</a>
            </div>
          </div>
          <div class="seo-local-map">
            <iframe
              title="Call4All service area — Kukas, Jaipur ${KUKAS.pin} on Google Maps"
              src="${mapSrc}"
              width="100%"
              height="320"
              style="border:0;border-radius:12px;"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              allowfullscreen></iframe>
          </div>
        </div>
      </section>`;
  }

  function renderInternalLinks(linkKeys, service) {
    if (!linkKeys || !linkKeys.length) return '';
    const items = linkKeys.map(k => {
      const l = INTERNAL[k];
      return l ? `<li><a href="${l.href}">${esc(l.label)}</a></li>` : '';
    }).filter(Boolean).join('');
    return `
      <section class="seo-block seo-internal-links" aria-labelledby="seo-links-title">
        <span class="section-eyebrow">Related Services</span>
        <h2 class="section-title" id="seo-links-title">More Services in <span class="accent">Kukas &amp; Jaipur</span></h2>
        <div class="title-divider"></div>
        <p class="section-subtitle">Explore related Call4All services while you are here for ${esc(service)}.</p>
        <ul class="seo-links-grid">${items}</ul>
      </section>`;
  }

  function renderMount(mount) {
    const key = mount.getAttribute('data-seo-page');
    const cfg = resolvePage(key);
    if (!cfg) return;
    const kukasOnly = !!cfg.kukasOnly;
    mount.innerHTML =
      renderLocalSections(cfg.localSections, kukasOnly) +
      renderBenefits(cfg.benefits) +
      renderPricingTable(cfg.pricing) +
      renderLocalContactBlock(cfg.service) +
      renderInternalLinks(cfg.links, cfg.service);
  }

  function mountAll() {
    document.querySelectorAll('.seo-enhance-mount[data-seo-page]').forEach(renderMount);
  }

  function injectLocalBusinessSchema() {
    const mount = document.querySelector('[data-seo-schema="local-business"]');
    if (!mount) return;
    const pageUrl = mount.getAttribute('data-page-url') || window.location.href;
    const serviceName = mount.getAttribute('data-service-name') || 'Call4All Services';
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      '@id': pageUrl + '#service',
      name: serviceName,
      url: pageUrl,
      provider: {
        '@type': 'LocalBusiness',
        '@id': 'https://call4all.co.in/#business',
        name: 'Call4All',
        image: 'https://call4all.co.in/assets/icons/icon-512.png',
        url: 'https://call4all.co.in/',
        telephone: KUKAS.phone,
        email: KUKAS.email,
        priceRange: '₹₹',
        address: {
          '@type': 'PostalAddress',
          streetAddress: KUKAS.street,
          addressLocality: KUKAS.locality,
          addressRegion: KUKAS.region,
          postalCode: KUKAS.pin,
          addressCountry: 'IN'
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: KUKAS.lat,
          longitude: KUKAS.lng
        },
        openingHoursSpecification: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          opens: '00:00',
          closes: '23:59'
        }
      },
      areaServed: [
        { '@type': 'AdministrativeArea', name: 'Kukas, Jaipur' },
        { '@type': 'City', name: 'Jaipur' }
      ]
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    mount.appendChild(script);
  }

  document.addEventListener('DOMContentLoaded', function () {
    mountAll();
    injectLocalBusinessSchema();
  });

  window.C4A_SEO = { KUKAS, PAGES, mountAll };
})();
