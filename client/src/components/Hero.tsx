export function Hero() {
  return (
    <div>
      <section className="max-w-[1440px] mx-auto px-container-padding py-section-gap grid grid-cols-1 lg:grid-cols-2 gap-gutter items-end min-h-[700px]">
        <div className="flex flex-col gap-8 pr-0 lg:pr-12">
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary leading-tight">
            Find a place you can
            <br />
            call home
          </h1>
          <div className="bg-surface-container-lowest border-hairline rounded-xl p-6 flex flex-col gap-4">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                search
              </span>
              <input
                className="w-full bg-transparent border-hairline rounded-lg py-4 pl-12 pr-4 focus:outline-none focus:border-primary transition-colors font-body-md text-body-md placeholder-on-surface-variant"
                placeholder="Search Mohammadpur..."
                type="text"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="border-hairline rounded-lg p-3 hover-darken transition-colors cursor-pointer group">
                <span className="block font-label-sm text-label-sm text-on-surface-variant mb-1 group-hover:text-primary">
                  Location
                </span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant">
                    location_on
                  </span>
                  <span className="font-body-md text-body-md">Dhaka</span>
                </div>
              </div>
              <div className="border-hairline rounded-lg p-3 hover-darken transition-colors cursor-pointer group">
                <span className="block font-label-sm text-label-sm text-on-surface-variant mb-1 group-hover:text-primary">
                  Price
                </span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant">
                    payments
                  </span>
                  <span className="font-body-md text-body-md">
                    ৳20,000 - 30,000
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="border-hairline rounded-lg p-3 hover-darken transition-colors cursor-pointer group">
                <span className="block font-label-sm text-label-sm text-on-surface-variant mb-1 group-hover:text-primary">
                  Bedrooms
                </span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant">
                    bed
                  </span>
                  <span className="font-body-md text-body-md">3</span>
                </div>
              </div>
              <button className="bg-primary text-on-primary rounded-lg flex items-center justify-center gap-2 font-label-sm text-label-sm uppercase tracking-widest hover:opacity-90 transition-opacity h-full min-h-[56px]">
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  search
                </span>
                Search
              </button>
            </div>
          </div>
        </div>
        <div className="relative h-[500px] lg:h-full w-full bg-surface-container-low border-hairline rounded-xl overflow-hidden group"></div>
      </section>
    </div>
  );
}
