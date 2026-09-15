import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App.jsx";

describe("App", () => {
  it("renders the greeting", () => {
    render(<App />);
    expect(screen.getByText(/Hola, TD Bootcamp!/)).toBeInTheDocument();
  });
});
