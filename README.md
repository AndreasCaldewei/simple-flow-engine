# TypeScript Workflow Engine

A flexible and robust workflow engine for building, executing, and monitoring task-based flows in TypeScript.

## Overview

This workflow engine provides a framework for designing and executing directed graphs of tasks with conditional transitions. It's designed to be extensible and supports various types of workflow nodes and custom task implementations.

## Features

- **Directed Graph Structure**: Define workflows as a graph of nodes connected by edges
- **Conditional Routing**: Define conditions on edges to control flow based on task outputs
- **Extensible Task System**: Register custom task handlers for different node types
- **Execution Tracking**: Comprehensive execution context with full tracing of node executions and edge traversals
- **Performance Metrics**: Built-in tracking of execution times and flow statistics
- **Error Handling**: Robust error capture and propagation throughout the flow

## Core Components

### FlowGraph

Manages the structure of the workflow:

- Adding and retrieving nodes and edges
- Finding the start node
- Determining outgoing paths

### TaskResolver

Handles the registration and execution of task implementations:

- Register task handlers for different node types
- Execute tasks with provided inputs
- Return task outputs

### FlowMachine

Orchestrates the execution of the workflow:

- Loads flow definitions
- Executes nodes in sequence based on edge conditions
- Tracks execution context
- Provides access to results and metrics

### Data Models

- **Node**: A task in the workflow with inputs, outputs, and a type
- **Edge**: A connection between nodes with optional conditions
- **ExecutionContext**: Tracks the state and history of a workflow execution

## Getting Started

### Installation

```bash
npm install typescript-workflow-engine
```

### Basic Usage

```typescript
import { FlowMachine, TaskResolver } from "typescript-workflow-engine";

// Create a new flow machine
const flowMachine = new FlowMachine();

// Register task handlers
flowMachine.taskResolver.registerTask("addNumbers", async (inputs) => {
  const a = inputs.a as number;
  const b = inputs.b as number;
  return { sum: a + b };
});

// Define a simple flow
const flowDefinition = {
  nodes: [
    {
      id: "start",
      type: "start",
      inputs: {},
      outputs: { a: 5, b: 3 },
    },
    {
      id: "add",
      type: "addNumbers",
      inputs: {}, // Will be populated during execution
      outputs: {}, // Will be populated during execution
    },
    {
      id: "end",
      type: "end",
      inputs: {}, // Will be populated during execution
      outputs: {}, // Will be populated during execution
    },
  ],
  edges: [
    {
      id: "start-to-add",
      source: "start",
      target: "add",
      conditions: {},
    },
    {
      id: "add-to-end",
      source: "add",
      target: "end",
      conditions: {},
    },
  ],
};

// Load the flow definition
flowMachine.loadFlow(flowDefinition);

// Execute the flow
async function runFlow() {
  try {
    await flowMachine.run();

    // Get the final result
    const result = flowMachine.getResult();
    console.log("Flow result:", result);

    // Get execution metrics
    const metrics = flowMachine.getExecutionMetrics();
    console.log("Execution metrics:", metrics);
  } catch (error) {
    console.error("Flow execution failed:", error);
  }
}

runFlow();
```

## Advanced Usage

### Conditional Branching

```typescript
// Define a flow with conditional branching
const conditionalFlow = {
  nodes: [
    { id: "start", type: "start", inputs: {}, outputs: { value: 15 } },
    { id: "checkValue", type: "evaluateNumber", inputs: {}, outputs: {} },
    { id: "handleLow", type: "processLowValue", inputs: {}, outputs: {} },
    { id: "handleHigh", type: "processHighValue", inputs: {}, outputs: {} },
    { id: "end", type: "end", inputs: {}, outputs: {} },
  ],
  edges: [
    {
      id: "start-to-check",
      source: "start",
      target: "checkValue",
      conditions: {},
    },
    {
      id: "check-to-low",
      source: "checkValue",
      target: "handleLow",
      conditions: { isHighValue: false },
    },
    {
      id: "check-to-high",
      source: "checkValue",
      target: "handleHigh",
      conditions: { isHighValue: true },
    },
    {
      id: "low-to-end",
      source: "handleLow",
      target: "end",
      conditions: {},
    },
    {
      id: "high-to-end",
      source: "handleHigh",
      target: "end",
      conditions: {},
    },
  ],
};
```

### Custom Task Implementations

```typescript
// Register a custom task with complex logic
flowMachine.taskResolver.registerTask("processData", async (inputs) => {
  const data = inputs.data as any[];

  // Perform complex processing
  const processed = data.map((item) => ({
    id: item.id,
    value: item.value * 2,
    status: item.value > 10 ? "high" : "low",
  }));

  // Return multiple outputs
  return {
    processedData: processed,
    count: processed.length,
    highValueCount: processed.filter((item) => item.status === "high").length,
  };
});
```

## API Reference

### FlowMachine

- `loadFlow(definition)`: Load a flow definition
- `run()`: Execute the flow from start to finish
- `getResult()`: Get the final result
- `getNodeResult(nodeId)`: Get the result of a specific node
- `getExecutionTrace()`: Get the full execution trace
- `getExecutionMetrics()`: Get performance metrics

### TaskResolver

- `registerTask(type, handler)`: Register a task handler
- `executeTask(node)`: Execute a task for a node

### FlowGraph

- `addNode(node)`: Add a node to the graph
- `addEdge(edge)`: Add an edge to the graph
- `getStartNode()`: Get the start node
- `getOutgoingEdges(nodeId)`: Get outgoing edges from a node
- `getTargetNode(edgeId)`: Get the target node for an edge
- `getNode(nodeId)`: Get a node by ID

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
