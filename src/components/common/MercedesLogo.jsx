import mercedesLogoUrl from "../../assets/mercedes-benz-9.svg";

export default function LogoMercedes({ className = "h-14 w-14" }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img alt="Mercedes-Benz" className="h-full w-full object-contain" src={mercedesLogoUrl} />
    </div>
  );
}
