# Flow Engine

A powerful, TypeScript-based engine for defining and executing rule-based flows with conditional logic.

## Overview

Flow Engine is a library that enables you to build and execute graph-based workflows where:

- Nodes represent executable tasks or decision points
- Edges represent transitions between nodes with conditional logic
- Rules determine which paths to follow based on the output of previous nodes

This engine is ideal for building:

- Business process workflows
- Decision trees
- State machines
- Event-driven applications
- Approval flows
- Service orchestration

## Core Components

### FlowGraph

Represents the structure of the workflow:

- **Nodes**: Executable units with inputs and outputs
- **Edges**: Connections between nodes with conditional routing

### HandlerResolver

Manages the execution of different node types:

- Register handlers for specific node types
- Execute the appropriate handler for each node

### FlowMachine

Orchestrates the execution of the entire flow:

- Traverses the graph based on conditional logic
- Manages data flow between nodes
- Tracks execution context for debugging and analysis

## Quick Start

```typescript
import { FlowMachine, HandlerResolver } from "flow-engine";

// Create a new flow machine
const flowMachine = new FlowMachine();

// Define handlers for different node types
flowMachine.handlers.registerHandler("calculate", async (inputs) => {
  const { a, b } = inputs;
  return {
    sum: Number(a) + Number(b),
    product: Number(a) * Number(b),
  };
});

flowMachine.handlers.registerHandler("decide", async (inputs) => {
  const { sum } = inputs;
  return {
    result: Number(sum) > 10 ? "large" : "small",
  };
});

// Define the flow structure
const flowDefinition = {
  nodes: [
    {
      id: "start",
      type: "start",
      inputs: {},
      outputs: { a: 5, b: 3 },
    },
    {
      id: "calculate",
      type: "calculate",
      inputs: {},
      outputs: {},
    },
    {
      id: "decide",
      type: "decide",
      inputs: {},
      outputs: {},
    },
    {
      id: "end-large",
      type: "end",
      inputs: {},
      outputs: {},
    },
    {
      id: "end-small",
      type: "end",
      inputs: {},
      outputs: {},
    },
  ],
  edges: [
    {
      id: "start-to-calc",
      source: "start",
      target: "calculate",
      conditions: {},
    },
    {
      id: "calc-to-decide",
      source: "calculate",
      target: "decide",
      conditions: {},
    },
    {
      id: "decide-to-large",
      source: "decide",
      target: "end-large",
      conditions: { result: "large" },
    },
    {
      id: "decide-to-small",
      source: "decide",
      target: "end-small",
      conditions: { result: "small" },
    },
  ],
};

// Load the flow definition
flowMachine.loadFlow(flowDefinition);

// Execute the flow
(async () => {
  try {
    const context = await flowMachine.run();
    console.log("Flow execution completed!");
    console.log("Result:", flowMachine.getResult());
    console.log("Metrics:", flowMachine.getExecutionMetrics());
  } catch (error) {
    console.error("Flow execution failed:", error);
  }
})();
```

## Advanced Features

### Conditional Routing with json-rules-engine

The engine supports complex conditional logic using [json-rules-engine](https://github.com/CacheControl/json-rules-engine):

```typescript
// Edge with complex conditions
{
  id: 'complex-condition',
  source: 'node1',
  target: 'node2',
  conditions: {
    all: [
      {
        fact: 'amount',
        operator: 'greaterThan',
        value: 1000
      },
      {
        fact: 'category',
        operator: 'equal',
        value: 'premium'
      }
    ]
  }
}
```

### Execution Context and Debugging

Get detailed execution traces for debugging and analysis:

```typescript
// After running the flow
const trace = flowMachine.getExecutionTrace();
console.log("Node executions:", trace.nodeExecutions);
console.log("Edge traversals:", trace.edgeTraversals);
```

### Performance Metrics

Monitor flow execution performance:

```typescript
const metrics = flowMachine.getExecutionMetrics();
console.log(
  `Executed ${metrics.nodeCount} nodes in ${metrics.executionTimeMs}ms`,
);
```

## Node Types

The engine has built-in support for these special node types:

- **start**: Entry point for the flow (required)
- **end**: Terminal node that completes a flow branch

You can register handlers for any custom node types:

```typescript
// Register a custom API call handler
flowMachine.handlers.registerHandler("api-call", async (inputs) => {
  const { url, method, data } = inputs;
  const response = await fetch(url, {
    method,
    body: data ? JSON.stringify(data) : undefined,
    headers: { "Content-Type": "application/json" },
  });

  return {
    status: response.status,
    data: await response.json(),
  };
});
```

## Best Practices

1. **Define clear node boundaries**: Each node should have a single responsibility
2. **Use meaningful node and edge IDs**: Makes debugging easier
3. **Keep conditions simple**: Complex conditions should be broken into multiple edges
4. **Handle errors gracefully**: Register error handler nodes for important operations
5. **Use end nodes appropriately**: All possible flow paths should lead to an end node

## License

MIT
