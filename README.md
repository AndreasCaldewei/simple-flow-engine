# FlowMachine

A TypeScript-based rule engine for executing node-based workflows with conditional branching.

## Overview

FlowMachine is a flexible workflow execution engine that allows you to define, load, and execute flow-based processes. The engine processes workflows as directed graphs, where:

- **Nodes** represent tasks or actions to be executed
- **Edges** connect nodes and include conditions that determine the flow path

The engine provides a complete execution context that tracks the entire process flow, allowing for detailed analysis, debugging, and performance monitoring.

## Features

- 🔄 Flow-based process execution with start and end nodes
- 🔀 Conditional branching with JSON-based rule evaluation
- 📊 Detailed execution tracking and metrics
- 🧩 Extensible task handler system
- 🔌 Plugin architecture for custom node types
- 📝 Complete execution context tracing
- ⏱️ Performance metrics for analysis

## Installation

```bash
npm install flow-machine
# or
yarn add flow-machine
```

## Basic Usage

```typescript
import { FlowMachine, HandlerResolver } from "flow-machine";

// 1. Create a new flow machine
const machine = new FlowMachine();

// 2. Register task handlers
machine.handlers.registerHandler("calculation", async (inputs) => {
  const { a, b } = inputs;
  return { result: Number(a) + Number(b) };
});

// 3. Define your flow
const flowDefinition = {
  nodes: [
    {
      id: "start",
      type: "start",
      inputs: {},
      outputs: { value: 10 },
    },
    {
      id: "calculate",
      type: "calculation",
      inputs: { a: 10, b: 20 },
      outputs: {},
    },
    {
      id: "end",
      type: "end",
      inputs: {},
      outputs: {},
    },
  ],
  edges: [
    {
      id: "edge1",
      source: "start",
      target: "calculate",
      conditions: {},
    },
    {
      id: "edge2",
      source: "calculate",
      target: "end",
      conditions: {},
    },
  ],
};

// 4. Load the flow
machine.loadFlow(flowDefinition);

// 5. Execute the flow
async function runFlow() {
  try {
    const result = await machine.run();
    console.log("Flow executed successfully");
    console.log("Final result:", machine.getResult());
    console.log("Execution metrics:", machine.getExecutionMetrics());
  } catch (error) {
    console.error("Flow execution failed:", error);
  }
}

runFlow();
```

## Core Components

### FlowGraph

Manages the graph structure of the workflow, including nodes and edges.

```typescript
const graph = new FlowGraph();
graph.addNode({ id: "node1", type: "task", inputs: {}, outputs: {} });
```

### HandlerResolver

Manages task handlers for different node types.

```typescript
const handlers = new HandlerResolver();
handlers.registerHandler("http", async (inputs) => {
  // Make HTTP request
  return { response: result };
});
```

### FlowMachine

The main engine that orchestrates the execution of the workflow.

```typescript
const machine = new FlowMachine();
machine.loadFlow(definition);
const result = await machine.run();
```

## Advanced Usage

### Conditional Branching

FlowMachine supports conditional branching through edge conditions:

```typescript
// Simple condition
const simpleEdge = {
  id: "edge1",
  source: "node1",
  target: "node2",
  conditions: { status: "success" },
};

// JSON Rules Engine condition
const complexEdge = {
  id: "edge2",
  source: "node1",
  target: "node3",
  conditions: {
    all: [
      { fact: "status", operator: "equal", value: "success" },
      { fact: "score", operator: "greaterThan", value: 80 },
    ],
  },
};
```

### Execution Context

FlowMachine provides detailed execution context:

```typescript
// Get complete execution trace
const trace = machine.getExecutionTrace();

// Get specific node result
const nodeResult = machine.getNodeResult("node1");

// Get performance metrics
const metrics = machine.getExecutionMetrics();
```

## Node Types

The system recognizes several special node types:

- **start**: Initiates the workflow
- **end**: Terminates the workflow and contains the final result
- **custom types**: Any registered handler type (e.g., 'http', 'calculation', etc.)

## Error Handling

The system captures errors during execution:

```typescript
try {
  await machine.run();
} catch (error) {
  const executionTrace = machine.getExecutionTrace();
  console.log("Error occurred:", executionTrace.error);
  console.log("Failed at node:", executionTrace.nodeExecutions.pop());
}
```

## TypeScript Interfaces

The system provides TypeScript interfaces for all components:

- `Node`: Defines a workflow node
- `Edge`: Defines a connection between nodes
- `ExecutionContext`: Defines the execution tracking structure

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT](LICENSE)
