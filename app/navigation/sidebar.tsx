import { NavLink } from "react-router";

export function Sidebar() {
  return (
    <div className="drawer">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content">
        <label htmlFor="my-drawer" className="btn btn-ghost drawer-button">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block h-5 w-5 stroke-current"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path> </svg>
        </label>
      </div>
      <div className="drawer-side">
        <label htmlFor="my-drawer" aria-label="close sidebar" className="drawer-overlay">
        <nav className="menu bg-base-200 text-base-content min-h-full w-80 p-4 mt-16">
          {links.map((link) => (
            <NavLink className="p-2 mb-1 bg-accent" key={link.to}
             to={link.to}>
              {link.title}
            </NavLink>
          ))}
        </nav>
        </label>
      </div>
    </div>

  );
}

const links = [
  {
    title: "Home",
    to: "/",
  },
  {
    title: "Photo",
    to: "/photo",
  },
  {
    title: "About",
    to: "/about",
  },
  {
    title: "Contact",
    to: "/contact",
  },
];