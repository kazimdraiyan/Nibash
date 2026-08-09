export function Footer() {
    return (
        <div>
            <footer className="bg-surface-container-lowest dark:bg-surface-container-high w-full py-section-gap border-t border-outline-variant dark:border-outline flat no shadows mt-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter px-container-padding max-w-[1440px] mx-auto w-full">
                    <div className="col-span-1 md:col-span-2 flex flex-col gap-4">
                        <span className="font-headline-md text-headline-md font-bold text-primary dark:text-on-primary-fixed">Nibash</span>
                        <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
                            © 2024 Nibash. Architectural precision in rental discovery.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <a className="text-on-surface-variant dark:text-on-surface-variant hover:text-primary dark:hover:text-on-primary-fixed underline transition-all font-body-md text-body-md opacity-80 hover:opacity-100" href="#">Find a Home</a>
                        <a className="text-on-surface-variant dark:text-on-surface-variant hover:text-primary dark:hover:text-on-primary-fixed underline transition-all font-body-md text-body-md opacity-80 hover:opacity-100" href="#">List a Property</a>
                        <a className="text-on-surface-variant dark:text-on-surface-variant hover:text-primary dark:hover:text-on-primary-fixed underline transition-all font-body-md text-body-md opacity-80 hover:opacity-100" href="#">About Us</a>
                    </div>
                    <div className="flex flex-col gap-3">
                        <a className="text-on-surface-variant dark:text-on-surface-variant hover:text-primary dark:hover:text-on-primary-fixed underline transition-all font-body-md text-body-md opacity-80 hover:opacity-100" href="#">Privacy Policy</a>
                        <a className="text-on-surface-variant dark:text-on-surface-variant hover:text-primary dark:hover:text-on-primary-fixed underline transition-all font-body-md text-body-md opacity-80 hover:opacity-100" href="#">Terms of Service</a>
                        <a className="text-on-surface-variant dark:text-on-surface-variant hover:text-primary dark:hover:text-on-primary-fixed underline transition-all font-body-md text-body-md opacity-80 hover:opacity-100" href="#">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}