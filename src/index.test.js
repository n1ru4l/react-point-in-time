import lolex from 'lolex'
import { createElement, Component } from 'react'
import Enzyme, { mount } from 'enzyme'
import EnzymeAdapter from 'enzyme-adapter-react-16'

import { formatDate, createTimeAgoObservable, TimeAgo } from '.'

Enzyme.configure({ adapter: new EnzymeAdapter() })

describe(`formatDate`, () => {
  const initial = Math.floor(new Date().getTime() / 1000)

  test.each(
    [
      [initial, initial, `now`, 120],
      [initial, initial + 119, `now`, 1],
      [initial, initial + 120, `2m ago`, 60],
      [initial, initial + 121, `2m ago`, 59],
      [initial, initial + 60 * 59, `59m ago`, 60],
      [initial, initial + 60 * 59 + 59, `59m ago`, 1],
      [initial, initial + 60 * 60, `1h ago`, 3600],
      [initial, initial + 60 * 60 * 2 - 1, `1h ago`, 1],
      [initial, initial + 60 * 120, `2h ago`, 3600],
      [initial, initial + 60 * 60 * 24 - 1, `23h ago`, 1],
      [initial, initial + 60 * 60 * 24, `1d ago`, 60 * 60 * 24],
      [initial, initial + 60 * 60 * 24 * 2, `2d ago`, 60 * 60 * 24],
      [initial, initial + 60 * 60 * 24 * 2 + 3, `2d ago`, 60 * 60 * 24 - 3],
    ],
    `returns the correct value for the start date %s and the current date %s which is '%s' and the next update in %s seconds`,
    (date, now, value, next) => {
      expect(formatDate(initial, now)).toEqual({
        value,
        next,
      })
    }
  )
})

describe(`createTimeAgoObservable`, () => {
  it(`publishes stuff`, done => {
    expect.assertions(1)

    const clock = lolex.install()
    const observable = createTimeAgoObservable(new Date())
    observable.subscribe(value => {
      expect(value).toEqual(`now`)
      done()
    })
    clock.uninstall()
  })

  it(`publishes multiple values over time`, done => {
    expect.assertions(1)

    const emittedValues = []
    let itemCounter = 0

    const clock = lolex.install()
    const observable = createTimeAgoObservable(new Date())
    observable.subscribe(value => {
      itemCounter++
      emittedValues.push(value)
      if (itemCounter > 1) {
        expect(emittedValues).toEqual([`now`, `2m ago`])
        done()
      }
    })
    clock.tick(`02:00`)
    clock.uninstall()
  })

  it(`does not publish values that are in the past`, done => {
    expect.assertions(1)

    const clock = lolex.install()

    const observable = createTimeAgoObservable(new Date())
    clock.tick(`05:00`)

    observable.subscribe(value => {
      expect(value).toEqual(`5m ago`)
      done()
    })
    clock.uninstall()
  })
})

describe(`<TimeAgo />`, () => {
  const render = ({ value } = {}) => createElement(`span`, null, value)

  it(`can be mounted`, done => {
    expect.assertions(1)

    const element = mount(createElement(TimeAgo, { date: new Date() }, render))

    Promise.resolve().then(() => {
      expect(element.text()).toEqual(`now`)
      element.unmount()
      done()
    })
  })

  it(`also supports a render prop`, done => {
    expect.assertions(1)

    const element = mount(createElement(TimeAgo, { date: new Date(), render }))

    Promise.resolve().then(() => {
      expect(element.text()).toEqual(`now`)
      element.unmount()
      done()
    })
  })

  it(`can update the date over time`, done => {
    expect.assertions(3)
    let clock = lolex.install()

    const element = mount(createElement(TimeAgo, { date: new Date() }, render))

    Promise.resolve()
      .then(() => {
        expect(element.text()).toEqual(`now`)
        clock.tick(`02:00`)
      })
      .then(() => {
        expect(element.text()).toEqual(`2m ago`)
        clock.tick(`01:00:00`)
      })
      .then(() => {
        expect(element.text()).toEqual(`1h ago`)
        element.unmount()
        clock.uninstall()
        done()
      })
  })

  it(`renders the correct date on the first render`, () => {
    expect.assertions(1)
    const element = mount(createElement(TimeAgo, { date: new Date() }, render))
    expect(element.text()).toEqual(`now`)
    element.unmount()
  })

  it(`does not rerender after the first render, if the value has not changed`, done => {
    expect.assertions(1)
    let counter = 0
    const render = () => {
      counter++
      return null
    }
    const element = mount(createElement(TimeAgo, { date: new Date() }, render))
    Promise.resolve().then(() => {
      expect(counter).toEqual(1)
      element.unmount()
      done()
    })
  })

  it(`does rerender after the date value changed with a new value`, done => {
    expect.assertions(2)
    const clock = lolex.install()

    const values = []
    const render = value => {
      values.push(value.value)
      return null
    }

    let setDate = () => undefined

    class TestComponent extends Component {
      constructor(props) {
        super(props)
        this.state = { date: new Date() }

        setDate = date => {
          this.setState({ date })
        }
      }
      render() {
        return createElement(TimeAgo, { date: this.state.date, render })
      }
    }

    const element = mount(createElement(TestComponent))

    Promise.resolve()
      .then(() => {
        expect(values).toEqual([`now`])
        setDate(new Date(Date.now() - 5 * 60000))
      })
      .then(() => {
        expect(values).toEqual([`now`, `5m ago`])
      })
      .catch(err => {
        done.fail(err)
      })
      .then(() => {
        element.unmount()
        clock.uninstall()
        done()
      })
  })
})
