
# KOOP - On-Course Refreshment Delivery Platform

KOOP is a high-fidelity digital ordering platform designed for golf courses, bowling alleys, and other entertainment venues. It connects patrons directly with service staff (Beverage Carts, Clubhouse Servers, Laneside Staff) for a seamless refreshment experience.

## Key Features

### For Patrons
- **Digital Menus**: High-quality, category-based menus with support for high-impact imagery.
- **Service Redundancy**: Intelligent fallback systems (like Hole Selection for iOS) when background GPS is restricted.
- **Live Tracking**: Real-time progress bar and map view showing both the driver's and patron's locations.
- **Automated Notifications**: System-level push notifications for order confirmation, dispatch, and delivery.
- **Screen Wake Lock**: Keeps the device active throughout the order lifecycle to ensure continuous tracking.
- **Integrated Gratuity**: Simple tip selection with support for custom amounts.

### For Establishment Staff
- **Specialized Dashboards**: Tailored interfaces for Beverage Cart Drivers, Clubhouse Staff, and Laneside Servers.
- **Live Operations Monitor**: Real-time queue management with color-coded status alerts (Warning/Overdue).
- **Staff Impersonation**: Administrative capability to instantly view staff-specific dashboards.
- **Sales Reporting**: Detailed sales analytics with support for Gross/Net revenue and Excel exports.
- **Dynamic Configuration**: Easy management of item availability, category visibility, and service-specific alerts.

## Technology Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS & ShadCN UI
- **Backend**: Firebase (Firestore & Authentication)
- **Maps**: Google Maps API via `@vis.gl/react-google-maps`
- **Utility**: `date-fns` for time management, `xlsx` for reporting.

## Deployment
This project is optimized for **Firebase App Hosting**. Connect your GitHub repository in the Firebase Console to enable automated CI/CD deployments.
