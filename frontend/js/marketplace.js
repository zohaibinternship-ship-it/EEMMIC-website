/* Marketplace showcase (marketplace.html) — view-only demo listings.
   All listing data below is static/hardcoded and illustrative: fictional
   companies, no prices, no transactional fields. There is no backend call
   on this page — filtering happens entirely against the LISTINGS array
   already loaded into memory. Do not wire this up to a checkout/cart flow;
   this page is a browse-only showcase by design. */
(function () {
  const grid = document.getElementById('marketplaceGrid');
  if (!grid) return;

  /* Every photo below was downloaded from Pexels' CDN (images.pexels.com) and
     lives locally at assets/images/marketplace/. Pexels License: free for
     commercial & personal use, no attribution required —
     https://www.pexels.com/license/. Each entry's comment names the original
     photo ID so it can be looked up at pexels.com/photo/<id> if swapped later.
     TODO: once EEMMIC has real listing partners, replace these with actual
     product/site photography supplied by each listed company. */
  const CATEGORIES = [
    { value: 'solar-epc', label: 'Solar EPC & Installation' },
    { value: 'energy-storage', label: 'Energy Storage & Grid Balancing' },
    { value: 'smart-grid', label: 'Smart Grid & Monitoring' },
    { value: 'om-services', label: 'O&M & Maintenance' },
    { value: 'wind-energy', label: 'Wind Energy' },
    { value: 'advisory', label: 'Advisory & Feasibility' },
    { value: 'financing', label: 'Financing & Investment' },
    { value: 'ev-charging', label: 'EV Charging Infrastructure' },
    { value: 'biomass', label: 'Biomass & Waste-to-Energy' },
    { value: 'transmission', label: 'Power Purchase & Transmission' }
  ];

  const LISTINGS = [
    {
      id: 'meridian-rooftop-solar',
      name: 'Meridian Rooftop Solar',
      category: 'solar-epc',
      tagline: 'Industrial & commercial rooftop solar EPC for textile mills and warehouses.',
      description: 'Meridian Rooftop Solar designs and installs rooftop solar arrays for manufacturing and warehousing sites, sized against a facility’s verified load profile rather than available roof space alone. Illustrative listing used to demonstrate how a rooftop-scale EPC profile appears on the marketplace.',
      images: [
        'assets/images/marketplace/meridian-rooftop-solar-1.jpg', // Pexels 9875441 — installer fitting a rooftop panel
        'assets/images/marketplace/meridian-rooftop-solar-2.jpg', // Pexels 8853502 — technician on a rooftop array
        'assets/images/marketplace/meridian-rooftop-solar-3.jpg'  // Pexels 356036 — solar panel array against sky
      ]
    },
    {
      id: 'aurora-ground-mount-solar',
      name: 'Aurora Ground-Mount Solar',
      category: 'solar-epc',
      tagline: 'Utility-scale ground-mount solar EPC for cement plants and large industrial sites.',
      description: 'Aurora builds ground-mount solar fields sized for heavy industrial demand — cement, steel, and large manufacturing sites with the land and load to support multi-megawatt arrays. Illustrative listing used to demonstrate how a utility-scale EPC profile appears on the marketplace.',
      images: [
        'assets/images/marketplace/aurora-ground-mount-solar-1.jpg', // Pexels 2800832 — aerial view of a ground-mount solar farm
        'assets/images/marketplace/aurora-ground-mount-solar-2.jpg', // Pexels 9799737 — aerial solar carports over a parking lot
        'assets/images/marketplace/aurora-ground-mount-solar-3.jpg'  // Pexels 8853509 — close-up solar panel cells
      ]
    },
    {
      id: 'voltreserve-storage-solutions',
      name: 'VoltReserve Storage Solutions',
      category: 'energy-storage',
      tagline: 'Containerized battery storage (BESS) for peak-shaving and backup power.',
      description: 'VoltReserve packages containerized battery energy storage with the switchgear and controls needed for peak-shaving, backup power, and grid balancing behind an industrial meter. Illustrative listing used to demonstrate how a storage & power-electronics profile appears on the marketplace.',
      images: [
        'assets/images/marketplace/voltreserve-storage-solutions-1.jpg', // Pexels 4491881 — technician working on rack-mounted power/control equipment
        'assets/images/marketplace/voltreserve-storage-solutions-2.jpg'  // Pexels 373543 — abstract blue data/network visualization
      ]
    },
    {
      id: 'gridsight-monitoring',
      name: 'GridSight Monitoring',
      category: 'smart-grid',
      tagline: 'Real-time load monitoring and predictive alerts for industrial energy users.',
      description: 'GridSight layers smart metering and SCADA-style dashboards over a site’s existing connection, flagging load anomalies before they become an outage or a penalty on the utility bill. Illustrative listing used to demonstrate how a monitoring/software profile appears on the marketplace.',
      images: [
        'assets/images/marketplace/gridsight-monitoring-1.jpg', // Pexels 1181677 — analyst monitoring live dashboards on multiple screens
        'assets/images/marketplace/gridsight-monitoring-2.jpg'  // Pexels 260931 — high-voltage substation switchgear
      ]
    },
    {
      id: 'sunguard-om-services',
      name: 'SunGuard O&M Services',
      category: 'om-services',
      tagline: 'Panel cleaning, inspection, and preventive maintenance contracts for solar assets.',
      description: 'SunGuard runs scheduled cleaning, thermal-imaging inspection, and preventive maintenance contracts to keep an existing solar asset performing at its rated output. Illustrative listing used to demonstrate how an O&M service profile appears on the marketplace.',
      images: [
        'assets/images/marketplace/sunguard-om-services-1.jpg', // Pexels 4254163 — engineer inspecting a solar panel array
        'assets/images/marketplace/sunguard-om-services-2.jpg', // Pexels 4254164 — technician servicing a panel with a drill
        'assets/images/marketplace/sunguard-om-services-3.jpg'  // Pexels 4254162 — two engineers working on a panel array together
      ]
    },
    {
      id: 'aeolus-wind-partners',
      name: 'Aeolus Wind Partners',
      category: 'wind-energy',
      tagline: 'Small and mid-scale wind turbine EPC for sites with strong wind corridors.',
      description: 'Aeolus develops small and mid-scale wind installations for industrial estates and sites sitting in a strong, verified wind corridor — usually paired with solar or storage rather than standalone. Illustrative listing used to demonstrate how a wind EPC profile appears on the marketplace.',
      images: [
        'assets/images/marketplace/aeolus-wind-partners-1.jpg', // Pexels 414837 — single wind turbine on a hillside at sunset
        'assets/images/marketplace/aeolus-wind-partners-2.jpg'  // Pexels 433308 — combined solar array and wind turbine
      ]
    },
    {
      id: 'vector-energy-advisory',
      name: 'Vector Energy Advisory',
      category: 'advisory',
      tagline: 'Independent feasibility studies and load audits ahead of financing.',
      description: 'Vector produces the independent feasibility studies, load audits, and technical due-diligence reports that buyers and lenders need before a requirement is qualified for Marketplace bidding. Illustrative listing used to demonstrate how an advisory profile appears on the marketplace.',
      images: [
        'assets/images/marketplace/vector-energy-advisory-1.jpg', // Pexels 3760529 — technical drawing being marked up on paper
        'assets/images/marketplace/vector-energy-advisory-2.jpg'  // Pexels 3862365 — two people reviewing site plans with a laptop
      ]
    },
    {
      id: 'helios-capital-partners',
      name: 'Helios Capital Partners',
      category: 'financing',
      tagline: 'Structured project financing and green debt facilities for verified assets.',
      description: 'Helios structures project financing and green debt facilities against energy assets that have already cleared Evaluation and Verification — financing the deal, not the pitch. Illustrative listing used to demonstrate how a financing-partner profile appears on the marketplace.',
      images: [
        'assets/images/marketplace/helios-capital-partners-1.jpg', // Pexels 3760067 — handshake over financing documents
        'assets/images/marketplace/helios-capital-partners-2.jpg'  // Pexels 3855619 — investment meeting at a laptop
      ]
    },
    {
      id: 'voltway-ev-infrastructure',
      name: 'VoltWay EV Infrastructure',
      category: 'ev-charging',
      tagline: 'Solar-canopy EV charging stations for commercial and retail parking.',
      description: 'VoltWay installs solar-canopy EV charging stations for malls, offices, and retail parking facilities, pairing on-site generation with the charging hardware so peak charging load doesn’t all land on the grid connection. Illustrative listing used to demonstrate how an EV-infrastructure profile appears on the marketplace.',
      images: [
        'assets/images/marketplace/voltway-ev-infrastructure-1.jpg', // Pexels 9800029 — solar-canopy EV charger with a car parked beneath it
        'assets/images/marketplace/voltway-ev-infrastructure-2.jpg', // Pexels 9800028 — solar-canopy EV charging structure, wide angle
        'assets/images/marketplace/voltway-ev-infrastructure-3.jpg'  // Pexels 9799738 — close-up of an EV charging connector
      ]
    },
    {
      id: 'greencycle-bioenergy',
      name: 'GreenCycle Bioenergy',
      category: 'biomass',
      tagline: 'Agricultural waste-to-energy plants converting crop residue into power.',
      description: 'GreenCycle converts agricultural residue — crop waste that would otherwise be burned in the field — into dispatchable power through small waste-to-energy plants sited near the farms that supply them. Illustrative listing used to demonstrate how a biomass profile appears on the marketplace.',
      images: [
        'assets/images/marketplace/greencycle-bioenergy-1.jpg', // Pexels 257700 — industrial processing plant towers
        'assets/images/marketplace/greencycle-bioenergy-2.jpg', // Pexels 2255801 — tractor and truck harvesting a crop field
        'assets/images/marketplace/greencycle-bioenergy-3.jpg'  // Pexels 96715 — green crop field at sunrise
      ]
    },
    {
      id: 'steadywatt-transmission-partners',
      name: 'SteadyWatt Transmission Partners',
      category: 'transmission',
      tagline: 'Long-term PPA structuring and interconnection advisory for large buyers.',
      description: 'SteadyWatt structures long-term power purchase agreements and handles the interconnection advisory work — NTDC and DISCO coordination — needed to get a large buyer’s supply actually onto the grid. Illustrative listing used to demonstrate how a transmission/PPA profile appears on the marketplace.',
      images: [
        'assets/images/marketplace/steadywatt-transmission-partners-1.jpg', // Pexels 189524 — transmission towers silhouetted at sunset
        'assets/images/marketplace/steadywatt-transmission-partners-2.jpg'  // Pexels 236089 — high-voltage substation insulators
      ]
    }
  ];

  const categoryLabel = {};
  CATEGORIES.forEach(function (c) { categoryLabel[c.value] = c.label; });

  const verifiedIconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';

  function cardHtml(listing) {
    return (
      '<button type="button" class="listing-card reveal" data-category="' + listing.category + '" data-title="' + listing.name.toLowerCase() + '" data-listing="' + listing.id + '">' +
        '<span class="listing-card-media">' +
          '<img src="' + listing.images[0] + '" alt="' + listing.name + '" loading="lazy">' +
          '<span class="listing-verified">' + verifiedIconSvg + 'Verified</span>' +
        '</span>' +
        '<span class="listing-card-body">' +
          '<span class="meta-pill">' + categoryLabel[listing.category] + '</span>' +
          '<h3>' + listing.name + '</h3>' +
          '<p>' + listing.tagline + '</p>' +
        '</span>' +
      '</button>'
    );
  }

  function renderGrid(listings) {
    grid.innerHTML = listings.length
      ? listings.map(cardHtml).join('')
      : '<p class="marketplace-empty">No listings match that search. Try a different category or keyword.</p>';

    const resultCount = document.getElementById('marketplaceResultCount');
    if (resultCount) {
      resultCount.textContent = listings.length + (listings.length === 1 ? ' listing' : ' listings');
    }

    grid.querySelectorAll('.listing-card').forEach(function (card) {
      card.addEventListener('click', function () { openModal(card.getAttribute('data-listing')); });
    });
  }

  function applyFilters() {
    const category = document.getElementById('marketCategoryFilter').value;
    const query = document.getElementById('marketSearchInput').value.trim().toLowerCase();
    const filtered = LISTINGS.filter(function (l) {
      const matchesCategory = category === 'all' || l.category === category;
      const matchesQuery = !query || l.name.toLowerCase().indexOf(query) !== -1;
      return matchesCategory && matchesQuery;
    });
    renderGrid(filtered);
  }

  /* Populate the category <select> */
  const select = document.getElementById('marketCategoryFilter');
  if (select) {
    CATEGORIES.forEach(function (c) {
      const opt = document.createElement('option');
      opt.value = c.value;
      opt.textContent = c.label;
      select.appendChild(opt);
    });
    select.addEventListener('change', applyFilters);
  }

  const searchInput = document.getElementById('marketSearchInput');
  if (searchInput) searchInput.addEventListener('input', applyFilters);

  /* Detail modal — longer description + a small image gallery, no price or
     buy action anywhere in this markup. */
  const modalOverlay = document.getElementById('listingModalOverlay');
  const modalBody = document.getElementById('listingModalBody');

  function openModal(id) {
    const listing = LISTINGS.filter(function (l) { return l.id === id; })[0];
    if (!listing || !modalOverlay || !modalBody) return;

    const galleryClass = listing.images.length > 1 ? 'listing-modal__gallery' : 'listing-modal__gallery single';
    const galleryHtml = listing.images.slice(0, 3).map(function (src) {
      return '<img src="' + src + '" alt="' + listing.name + '" loading="lazy">';
    }).join('');

    modalBody.innerHTML =
      '<div class="' + galleryClass + '">' + galleryHtml + '</div>' +
      '<div class="listing-modal__body">' +
        '<div class="listing-modal__meta"><span class="meta-pill">' + categoryLabel[listing.category] + '</span>' +
          '<span class="listing-verified" style="position:static;">' + verifiedIconSvg + 'Verified</span></div>' +
        '<h2 class="listing-modal__title">' + listing.name + '</h2>' +
        '<p class="listing-modal__desc">' + listing.description + '</p>' +
        '<p class="listing-modal__note">Illustrative example shown to demonstrate marketplace structure — not a live listing or offer.</p>' +
      '</div>';

    modalOverlay.classList.add('is-open');
    document.body.classList.add('no-scroll');
  }

  function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', function (e) {
      if (e.target === modalOverlay || e.target.closest('[data-modal-close]')) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
  }

  renderGrid(LISTINGS);
})();
