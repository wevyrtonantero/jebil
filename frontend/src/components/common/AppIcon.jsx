function AppIcon({ name, className = "", size = 20 }) {
  const icons = {
    menu: (
      <>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </>
    ),
    reception: (
      <>
        <rect x="6" y="5" width="12" height="15" rx="2" />
        <path d="M9 3h6" />
        <path d="M9 10h6" />
        <path d="M9 14h6" />
      </>
    ),
    workshop: (
      <>
        <path d="M15 7.5a4.5 4.5 0 0 0-5.8 5.8L4.5 18 6 19.5l4.7-4.7A4.5 4.5 0 0 0 16.5 9L13 12.5l-1.5-1.5L15 7.5Z" />
      </>
    ),
    mechanic: (
      <>
        <circle cx="12" cy="7.5" r="3.5" />
        <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
      </>
    ),
    clients: (
      <>
        <circle cx="9" cy="9" r="3" />
        <circle cx="16.5" cy="10" r="2.5" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
        <path d="M14 19a4.5 4.5 0 0 1 7 0" />
      </>
    ),
    reports: (
      <>
        <path d="M5 18V9" />
        <path d="M12 18V5" />
        <path d="M19 18v-7" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3" />
        <path d="M12 19v3" />
        <path d="m4.9 4.9 2.1 2.1" />
        <path d="m17 17 2.1 2.1" />
        <path d="M2 12h3" />
        <path d="M19 12h3" />
        <path d="m4.9 19.1 2.1-2.1" />
        <path d="M17 7l2.1-2.1" />
      </>
    ),
    board: (
      <>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M4 10h16" />
        <path d="M10 10v9" />
      </>
    ),
    bell: (
      <>
        <path d="M8 18h8" />
        <path d="M6 18h12l-1.2-1.4A2 2 0 0 1 16 15.3V11a4 4 0 1 0-8 0v4.3c0 .5-.2 1-.6 1.3L6 18Z" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 1 1 8 0v3" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    eyeOff: (
      <>
        <path d="M3 3 21 21" />
        <path d="M10.6 10.7a3 3 0 0 0 4.2 4.2" />
        <path d="M9.9 5.1A11.4 11.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-4 4.8" />
        <path d="M6.6 6.7C3.8 8.5 2 12 2 12a17.5 17.5 0 0 0 10 6c1 0 2-.1 2.9-.4" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    arrowRight: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12" />
        <path d="M18 6 6 18" />
      </>
    ),
    check: (
      <>
        <path d="m5 12 4 4 10-10" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    sos: (
      <>
        <path d="M12 3 4.5 7v5.5c0 4.2 2.7 6.7 7.5 8.5 4.8-1.8 7.5-4.3 7.5-8.5V7L12 3Z" />
        <path d="M9 12h6" />
        <path d="M12 9v6" />
      </>
    ),
    flash: (
      <>
        <path d="M13 2 6 13h5l-1 9 8-12h-5l0-8Z" />
      </>
    ),
    send: (
      <>
        <path d="m21 3-9 9" />
        <path d="M21 3 14 21l-4-9-9-4Z" />
      </>
    ),
    motorcycle: (
      <>
        <circle cx="6" cy="17" r="3" />
        <circle cx="18" cy="17" r="3" />
        <path d="M6 17h5l2-6h3l3 6" />
        <path d="M11 11 8 8H5" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    drag: (
      <>
        <circle cx="9" cy="7" r="1" />
        <circle cx="15" cy="7" r="1" />
        <circle cx="9" cy="12" r="1" />
        <circle cx="15" cy="12" r="1" />
        <circle cx="9" cy="17" r="1" />
        <circle cx="15" cy="17" r="1" />
      </>
    ),
    money: (
      <>
        <path d="M12 3v18" />
        <path d="M16.5 7.5c0-1.9-2-3.5-4.5-3.5S7.5 5.6 7.5 7.5 9.5 11 12 11s4.5 1.6 4.5 3.5S14.5 18 12 18s-4.5-1.6-4.5-3.5" />
      </>
    ),
    whatsapp: (
      <>
        <path d="M20 11.5a8 8 0 1 1-14.8 4.1L4 20l4.6-1.2A8 8 0 1 1 20 11.5Z" />
        <path d="M9.2 8.8c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .5.4l.6 1.5c.1.3.1.5-.1.7l-.5.7c.7 1.2 1.7 2.1 3 2.8l.7-.7c.2-.2.4-.2.7-.1l1.5.6c.3.1.4.3.4.5v.5c0 .2 0 .4-.4.6-.5.3-1.1.5-1.8.4-1.1-.1-2.5-.8-3.9-2.1-1.5-1.4-2.3-2.8-2.4-3.9-.1-.7.1-1.3.4-1.8Z" />
      </>
    ),
    camera: (
      <>
        <path d="M5 8h3l1.6-2h4.8L16 8h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
        <circle cx="12" cy="14" r="3.5" />
      </>
    ),
    pencil: (
      <>
        <path d="m4 20 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" />
        <path d="m13.5 6.5 3 3" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16" />
        <path d="M9 7V4h6v3" />
        <path d="M7 7v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </>
    ),
    printer: (
      <>
        <path d="M7 9V4h10v5" />
        <path d="M6 18H5a2 2 0 0 1-2-2v-4a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v4a2 2 0 0 1-2 2h-1" />
        <path d="M7 14h10v6H7z" />
      </>
    ),
    checkbox: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    cloud: (
      <>
        <path d="M7 18a4 4 0 1 1 .8-7.9A5.5 5.5 0 0 1 18 11a3.5 3.5 0 1 1 0 7H7Z" />
      </>
    ),
    thermometer: (
      <>
        <path d="M14 14.8V6a2 2 0 1 0-4 0v8.8a4 4 0 1 0 4 0Z" />
        <path d="M12 10v6" />
      </>
    ),
    newspaper: (
      <>
        <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4H19v13.5A2.5 2.5 0 0 1 16.5 20H7.5A2.5 2.5 0 0 1 5 17.5Z" />
        <path d="M8 8h8" />
        <path d="M8 12h8" />
        <path d="M8 16h5" />
      </>
    ),
  };

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name] || icons.menu}
    </svg>
  );
}

export default AppIcon;
