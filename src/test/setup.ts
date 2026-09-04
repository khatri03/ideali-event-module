import "@testing-library/jest-dom/vitest"
import { afterEach } from "vitest"
import { cleanup, configure } from "@testing-library/react"

// Testing Library waits one second by default, which several suites running at once can exhaust on work that is not
// actually slow. Vitest fails the test at five seconds regardless, so a genuine hang is still caught here.
configure({ asyncUtilTimeout: 5000 })

afterEach(cleanup)
