interface FooterProps {
  onNavigate?: (view: "home" | "login" | "register") => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const handleNav = (view: "home") => {
    if (onNavigate) {
      onNavigate(view);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="bg-surface-container-lowest dark:bg-surface-container-high w-full py-section-gap border-t border-outline-variant dark:border-outline flat no shadows mt-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter px-container-padding max-w-[1440px] mx-auto w-full">
        <div className="col-span-1 md:col-span-2 flex flex-col gap-4">
          <button
            onClick={() => handleNav("home")}
            className="font-headline-md text-headline-md font-bold text-primary dark:text-on-primary-fixed text-left cursor-pointer"
          >
            Nibash
          </button>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Molestias
            doloribus libero beatae quo sit pariatur!
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold mb-1">
            Platform
          </span>
          <button
            onClick={() => handleNav("home")}
            className="text-on-surface-variant dark:text-on-surface-variant hover:text-primary dark:hover:text-on-primary-fixed underline transition-all font-body-md text-body-md opacity-80 hover:opacity-100 text-left cursor-pointer"
          >
            Find a Home
          </button>
          <button className="text-on-surface-variant dark:text-on-surface-variant hover:text-primary dark:hover:text-on-primary-fixed underline transition-all font-body-md text-body-md opacity-80 hover:opacity-100 text-left cursor-pointer">
            List a Property
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold mb-1">
            Legal & Support
          </span>
          <a
            className="text-on-surface-variant dark:text-on-surface-variant hover:text-primary dark:hover:text-on-primary-fixed underline transition-all font-body-md text-body-md opacity-80 hover:opacity-100"
            href="#"
          >
            Privacy Policy
          </a>
          <a
            className="text-on-surface-variant dark:text-on-surface-variant hover:text-primary dark:hover:text-on-primary-fixed underline transition-all font-body-md text-body-md opacity-80 hover:opacity-100"
            href="#"
          >
            Terms of Service
          </a>
          <a
            className="text-on-surface-variant dark:text-on-surface-variant hover:text-primary dark:hover:text-on-primary-fixed underline transition-all font-body-md text-body-md opacity-80 hover:opacity-100"
            href="#"
          >
            Contact
          </a>
          <a
            className="text-on-surface-variant dark:text-on-surface-variant hover:text-primary dark:hover:text-on-primary-fixed underline transition-all font-body-md text-body-md opacity-80 hover:opacity-100"
            href="#"
          >
            About Us
          </a>
        </div>
      </div>
    </footer>
  );
}
